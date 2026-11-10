import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { writeFileSync,mkdirSync } from 'node:fs'
const browser=await chromium.launch({headless:true})
const results=[]
try {
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[]
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(process.env.LITGRID_BROWSER_URL??'http://127.0.0.1:5186')
  await page.waitForSelector('#alignment')
  for(const source of ['alignment','alignment-programmatic']) {
    await page.locator('#'+source).click()
    await page.waitForFunction(()=>document.querySelector('yc-grid')?.shadowRoot?.querySelector('.row .cell-align-right'))
    const before=await page.evaluate(async()=>{
      const grid=document.querySelector('yc-grid');grid.setColumnWidth('salary',310);grid.moveColumn('name',0)
      const viewport=grid.shadowRoot.querySelector('.viewport');viewport.focus();viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));await grid.updateComplete
      window.alignmentGrid=grid
      return{state:grid.getColumnState(),active:viewport.getAttribute('aria-activedescendant'),text:grid.shadowRoot.querySelector('.row').textContent}
    })
    const errorCount=errors.length
    await page.locator('#alignment-invalid').click()
    await page.waitForFunction(()=>document.querySelector('#revision').textContent.length>0)
    const deadline=Date.now()+30000
    while(!errors.slice(errorCount).some(message=>message.includes('salary')&&message.includes('alignment'))) {
      if(Date.now()>deadline)throw Error('Timed out waiting for actual .NET alignment rejection')
      await new Promise(resolve=>setTimeout(resolve,50))
    }
    const unchanged=await page.evaluate(()=>{const grid=document.querySelector('yc-grid');return{state:grid.getColumnState(),same:grid===window.alignmentGrid,text:grid.shadowRoot.querySelector('.row').textContent}})
    assert.equal(unchanged.same,true);assert.deepEqual(unchanged.state,before.state);assert.equal(unchanged.text,before.text)
    await page.locator('#alignment-center').click()
    await page.waitForFunction(()=>document.querySelector('yc-grid')?.shadowRoot?.querySelector('.row [data-column-index="1"]')?.classList.contains('cell-align-center'))
    const after=await page.evaluate(()=>{const grid=document.querySelector('yc-grid');return{state:grid.getColumnState(),active:grid.shadowRoot.querySelector('.viewport').getAttribute('aria-activedescendant')}})
    assert.deepEqual(after.state,before.state);assert.equal(after.active,before.active)
    await page.locator('#alignment-none').click()
    await page.waitForFunction(()=>!document.querySelector('yc-grid')?.shadowRoot?.querySelector('.row [data-column-index="1"]')?.className.includes('cell-align-'))
    results.push({source,realDotNetJSON:true,invalidRejected:true,recovered:true,removed:true,userState:true,focus:true})
  }
  assert.deepEqual(errors.filter(message=>!message.includes('salary')),[],'no unexpected browser errors')
  const report={browser:browser.version(),results,expectedValidationDiagnostics:errors.length}
  mkdirSync('.private',{recursive:true});writeFileSync('.private/column-alignment-blazor-browser.json',JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report,null,2))
} finally { await browser.close() }
