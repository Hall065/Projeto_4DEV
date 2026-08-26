import { APEXCHARTS_SCRIPT } from '@/vendor/apexcharts';
import type { ApexChartModel } from './types';

function safeJson(value: unknown) {
  const escape = String.fromCharCode(92);

  return JSON.stringify(value)
    .split('<')
    .join(escape + 'u003c')
    .split('>')
    .join(escape + 'u003e')
    .split('&')
    .join(escape + 'u0026');
}

function escapeScript(source: string) {
  return source.split('</script').join('<' + String.fromCharCode(92) + '/script');
}

export function createApexChartHtml(model: ApexChartModel, shouldAnimate: boolean) {
  const serializedModel = safeJson(model);
  const serializedMotion = safeJson(Boolean(shouldAnimate));

  return [
    '<!doctype html>',
    '<html><head><meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />',
    '<style>html,body,#chart{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}*{box-sizing:border-box}</style>',
    '</head><body><div id="chart"></div>',
    '<script>',
    escapeScript(APEXCHARTS_SCRIPT),
    '</script><script>',
    '(function(){',
    'var model=' + serializedModel + ';',
    'var shouldAnimate=' + serializedMotion + ';',
    'function send(type,payload){if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:type,payload:payload||{}}));}}',
    'window.onerror=function(message){send("error",{message:String(message)});};',
    'try {',
    'var events={dataPointSelection:function(event,chartContext,config){send("select",{index:config.dataPointIndex});}};',
    'var chartOptions=Object.assign({},model.options,{series:model.series,chart:Object.assign({},model.options.chart||{},{type:model.type,height:"100%",events:events,animations:Object.assign({},(model.options.chart||{}).animations||{},{enabled:shouldAnimate})})});',
    'var chart=new ApexCharts(document.querySelector("#chart"),chartOptions);',
    'chart.render().then(function(){send("ready");});',
    '} catch(error) { send("error",{message:String(error&&error.message||error)}); }',
    '})();',
    '</script></body></html>',
  ].join(String.fromCharCode(10));
}
