import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

const replace=(code,from,to,count=1)=>{
 const occurrences=typeof from==='string'?code.split(from).length-1:[...code.matchAll(from)].length
 if(occurrences!==count)throw Error(`Patch expected ${count}, got ${occurrences}: ${String(from).slice(0,100)}`)
 return typeof from==='string'?code.replace(from,to):code.replace(from,to)
}

// Temporary build-time transformations of exact production JS. No source or
// package dist file is written. Ablations intentionally lack configured behavior.
export function transformVariant(variant,id,input,baseline){
 const file=id.replaceAll('\\','/').split('?')[0]
 let code=input
 if(variant==='no-vue-metadata'&&file.endsWith('/grid-vue/dist/gridBindings.js')){
  return readFileSync(resolve(baseline,'packages/grid-vue/dist/gridBindings.js'),'utf8')
 }
 if(variant==='no-web-guards'&&file.endsWith('/grid-web/dist/components/DataGrid.js')){
  code=replace(code,/(?:value|input)\.some\(column => 'align' in column \|\| 'format' in column\)\s*\? prepareColumns\((?:value|input), this\.columnFormats\)\s*:\s*/g,'',2)
  code=replace(code,/        if \(this\.hasColumnAlignment\) \{\r?\n            const alignment = this\.columnAlignments\.get\((?:column\.key|columnKey)\);\r?\n            if \(alignment\)\r?\n                classes\.push\(alignment\);\r?\n        \}\r?\n/g,'',2)
 }
 if(variant==='no-alignment-css'&&file.endsWith('/grid-web/dist/components/DataGrid.js')){
  code=replace(code,/^ *\.cell-align-(?:left|right|center|start|end) \{[^\r\n]*\}\r?\n/gm,'',5)
  code=replace(code,/^ *\.header-cell\[class\*="cell-align-"\] \.(?:header-label|header-actions) \{[^\r\n]*\}\r?\n/gm,'',2)
 }
 if(['shared-date','shared-date-detached'].includes(variant)&&file.endsWith('/grid-web/dist/formatting/columnFormatting.js')){
  code=code.replaceAll('\r\n','\n')
  code=replace(code,'    const formats = new Map();',`    const formats = new Map();
    // Local staging pool: only entries returned in formats survive adoption.
    const datePool = new Map();
    const dateKey = format => JSON.stringify([format.locale, format.options.dateStyle ?? null, format.options.timeStyle ?? null, format.options.timeZone]);
    for (const old of previous.values()) {
        if (old.descriptor.kind === 'dateTime' && old.formatter) datePool.set(dateKey(old.descriptor), old.formatter);
    }`)
  code=replace(code,`                    const formatter = format.kind === 'number'
                        ? new Intl.NumberFormat(format.locale, format.options)
                        : new Intl.DateTimeFormat(format.locale, format.options);`, `                    const sharedKey = format.kind === 'dateTime' ? dateKey(format) : undefined;
                    let formatter = sharedKey === undefined ? undefined : datePool.get(sharedKey);
                    if (!formatter) {
                        formatter = format.kind === 'number'
                            ? new Intl.NumberFormat(format.locale, format.options)
                            : new Intl.DateTimeFormat(format.locale, format.options);
                        if (sharedKey !== undefined) datePool.set(sharedKey, formatter);
                    }`)
  code=replace(code,'formats.set(column.key, { descriptor: format, display });','formats.set(column.key, { descriptor: format, display, ...(format.kind === \'dateTime\' ? { formatter } : {}) });')
 }
 if(['detached-display','shared-date-detached'].includes(variant)&&file.endsWith('/grid-web/dist/formatting/columnFormatting.js')){
  code=code.replaceAll('\r\n','\n')
  const prefix='                    const display = ',start=code.indexOf(prefix),end=code.indexOf('\n                    formats.set(column.key,',start)
  if(start<0||end<0)throw Error('Display factory extraction did not match')
  const expression=code.slice(start+prefix.length,end).trim().replace(/;$/,'')
  code=code.slice(0,start)+prefix+'detachedDisplay(format, formatter);'+code.slice(end)
  code=replace(code,'/** All work is staged;',`function detachedDisplay(format, formatter) {\n    return ${expression};\n}\n\n/** All work is staged;`)
 }
 return code
}
