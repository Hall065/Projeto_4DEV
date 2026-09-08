import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const projectRoot = process.cwd();
const roots = ['app', path.join('src', 'components')];
const strict = process.argv.includes('--strict');
const extensions = new Set(['.ts', '.tsx']);
// O inventario foi zerado. Qualquer novo texto direto ou fora do catalogo falha no CI.
const LEGACY_FINDINGS_BASELINE = 0;

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return extensions.has(path.extname(entry.name)) ? [absolute] : [];
  });
}

function tagName(node) {
  if (ts.isIdentifier(node.tagName)) return node.tagName.text;
  return '';
}

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function isUserFacing(value) {
  const text = normalizeText(value);
  return text.length > 1 && /[A-Za-zÀ-ÿ]/.test(text);
}

const findings = [];
const catalogSource = fs.readFileSync(path.join(projectRoot, 'src', 'hooks', 'useI18n.ts'), 'utf8');
const catalogFile = ts.createSourceFile(
  'useI18n.ts',
  catalogSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS
);
const catalogKeys = new Set();

function collectCatalogKeys(node) {
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === 'en' &&
    node.initializer &&
    ts.isObjectLiteralExpression(node.initializer)
  ) {
    node.initializer.properties.forEach((property) => {
      if (!ts.isPropertyAssignment(property)) return;
      if (ts.isStringLiteral(property.name) || ts.isNoSubstitutionTemplateLiteral(property.name)) {
        catalogKeys.add(property.name.text);
      }
    });
  }
  ts.forEachChild(node, collectCatalogKeys);
}

collectCatalogKeys(catalogFile);

for (const file of roots.flatMap((root) => walk(path.join(projectRoot, root)))) {
  const sourceText = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function report(node, kind, value) {
    const text = normalizeText(value);
    if (!isUserFacing(text)) return;
    const position = source.getLineAndCharacterOfPosition(node.getStart(source));
    findings.push({
      file: path.relative(projectRoot, file).replaceAll('\\', '/'),
      line: position.line + 1,
      kind,
      text,
    });
  }

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 't' &&
      node.arguments[0] &&
      (ts.isStringLiteral(node.arguments[0]) ||
        ts.isNoSubstitutionTemplateLiteral(node.arguments[0])) &&
      !catalogKeys.has(node.arguments[0].text)
    ) {
      report(node.arguments[0], 'Fora do catalogo', node.arguments[0].text);
    }

    if (ts.isJsxElement(node) && tagName(node.openingElement) === 'Text') {
      for (const child of node.children) {
        if (ts.isJsxText(child)) report(child, 'Text', child.text);
        if (
          ts.isJsxExpression(child) &&
          child.expression &&
          (ts.isStringLiteral(child.expression) || ts.isNoSubstitutionTemplateLiteral(child.expression))
        ) {
          report(child, 'Text expression', child.expression.text);
        }

        if (ts.isJsxExpression(child) && child.expression) {
          const inspectRenderedBranches = (expression) => {
            if (ts.isParenthesizedExpression(expression)) {
              inspectRenderedBranches(expression.expression);
              return;
            }
            if (ts.isConditionalExpression(expression)) {
              inspectRenderedBranches(expression.whenTrue);
              inspectRenderedBranches(expression.whenFalse);
              return;
            }
            if (
              ts.isBinaryExpression(expression) &&
              [
                ts.SyntaxKind.QuestionQuestionToken,
                ts.SyntaxKind.BarBarToken,
                ts.SyntaxKind.PlusToken,
              ].includes(expression.operatorToken.kind)
            ) {
              inspectRenderedBranches(expression.left);
              inspectRenderedBranches(expression.right);
              return;
            }
            if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
              report(expression, 'Expressao renderizada sem t()', expression.text);
            }
          };
          inspectRenderedBranches(child.expression);
        }
      }
    }

    if (
      ts.isJsxAttribute(node) &&
      ['accessibilityLabel', 'accessibilityHint', 'placeholder'].includes(node.name.text)
    ) {
      if (node.initializer && ts.isStringLiteral(node.initializer)) {
        report(node, node.name.text, node.initializer.text);
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(source) === 'Alert' &&
      node.expression.name.text === 'alert'
    ) {
      node.arguments.forEach((argument) => {
        if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
          report(argument, 'Alert.alert', argument.text);
        }
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
}

if (findings.length === 0) {
  console.log('Auditoria i18n mobile: nenhum texto direto encontrado.');
  process.exit(0);
}

console.log(`Auditoria i18n mobile: ${findings.length} texto(s) direto(s) para revisar.`);
for (const finding of findings) {
  console.log(`${finding.file}:${finding.line} [${finding.kind}] ${finding.text}`);
}

if (strict && findings.length > LEGACY_FINDINGS_BASELINE) {
  console.error(
    `Falha: a quantidade aumentou de ${LEGACY_FINDINGS_BASELINE} para ${findings.length}.`
  );
  process.exit(1);
}

if (strict) {
  console.log(
    `Verificacao aprovada: ${findings.length}/${LEGACY_FINDINGS_BASELINE} ocorrencias no limite legado.`
  );
}
