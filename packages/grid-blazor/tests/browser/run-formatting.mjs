import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
const browser=await chromium.launch({headless:true})
const results=[]
try{
  const page=await browser.newPage({viewport:{width:1280,height:900}})
  const errors=[]
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(process.env.LITGRID_BROWSER_URL??'http://127.0.0.1:5186')
  await page.waitForSelector('#formatting')
  for(const source of ['formatting','formatting-programmatic'])for(const invalidAction of ['formatting-invalid','formatting-invalid-align','formatting-invalid-option','formatting-invalid-type']){
    await page.locator('#'+source).click()
    await page.waitForFunction(()=>document.querySelector('yc-grid')?.shadowRoot?.querySelector('.row')?.textContent?.includes('£200.50'))
    const before=await page.evaluate(async()=>{
      const grid=document.querySelector('yc-grid');grid.setColumnWidth('salary',310);grid.moveColumn('joined',0)
      const viewport=grid.shadowRoot.querySelector('.viewport');viewport.focus();viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));await grid.updateComplete
      return{state:grid.getColumnState(),active:viewport.getAttribute('aria-activedescendant'),text:grid.shadowRoot.querySelector('.row').textContent}
    })
    assert.match(before.text,/1 Feb 2020,? 08:00/)
    const errorCount=errors.length
    await page.locator('#'+invalidAction).click()
    const deadline=Date.now()+30000
    while(!errors.slice(errorCount).some(message=>message.includes('Column')&&message.includes('salary'))){
      if(Date.now()>deadline)throw Error('Timed out waiting for actual browser descriptor rejection')
      await new Promise(resolve=>setTimeout(resolve,50))
    }
    assert.ok(errors.slice(errorCount).some(message=>message.includes('Column')&&message.includes('salary')),'actual JS validation failure reported to .NET')
    const unchanged=await page.evaluate(()=>document.querySelector('yc-grid').getColumnState())
    assert.deepEqual(unchanged,before.state)
    await page.locator('#formatting-locale').click()
    await page.waitForFunction(()=>document.querySelector('yc-grid')?.shadowRoot?.querySelector('.row')?.textContent?.includes('200,50'))
    const after=await page.evaluate(()=>{const grid=document.querySelector('yc-grid');return{state:grid.getColumnState(),active:grid.shadowRoot.querySelector('.viewport').getAttribute('aria-activedescendant'),align:grid.shadowRoot.querySelector('[data-column-index="1"]').className}})
    assert.deepEqual(after.state,before.state)
    assert.equal(after.active,before.active)
    assert.match(after.align,/cell-align-right/)
    results.push({source,invalidAction,realDotNetJSON:true,dateOffset:true,invalidRejected:true,recovered:true,userState:true,focus:true})
  }
  assert.deepEqual(errors.filter(message=>!/Column\s+"?salary"?/.test(message)),[],'no unexpected browser errors')
  const report={browser:browser.version(),results,expectedValidationDiagnostics:errors.length}
  writeFileSync('.private/column-formatting-blazor-browser.json',JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report,null,2))
}finally{await browser.close()}
