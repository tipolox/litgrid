// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { DataGrid } from './DataGrid.js'
import { darkThemeStyles } from '../theme/darkTheme.js'
import { lightThemeStyles } from '../theme/lightTheme.js'

afterEach(() => {
  document.body.replaceChildren()
})

describe('DataGrid themes', () => {
  it('uses the Light Theme by default and reflects an explicit selection', async () => {
    const grid = new DataGrid()

    expect(grid.theme).toBe('light')

    document.body.append(grid)
    await grid.updateComplete

    expect(grid.getAttribute('theme')).toBe('light')

    grid.theme = 'light'
    await grid.updateComplete

    expect(grid.getAttribute('theme')).toBe('light')
  })

  it('reflects an explicit Dark Theme selection through the property and attribute', async () => {
    const grid = new DataGrid()
    document.body.append(grid)

    grid.theme = 'dark'
    await grid.updateComplete

    expect(grid.getAttribute('theme')).toBe('dark')

    grid.setAttribute('theme', 'light')
    await grid.updateComplete

    expect(grid.theme).toBe('light')
  })

  it('defines semantic Light and Dark Theme tokens and allows host overrides', () => {
    expect(lightThemeStyles.cssText).toContain('--litgrid-color-surface: #ffffff')
    expect(lightThemeStyles.cssText).toContain('--litgrid-color-accent: #2563eb')
    expect(lightThemeStyles.cssText).toContain('--litgrid-shadow-menu: 0 12px 24px')
    expect(darkThemeStyles.cssText).toContain(":host([theme='dark'])")
    expect(darkThemeStyles.cssText).toContain('--litgrid-color-surface: #0f172a')
    expect(darkThemeStyles.cssText).toContain('--litgrid-color-accent: #60a5fa')
    expect(darkThemeStyles.cssText).toContain('--litgrid-shadow-dialog: 0 8px 20px')

    const grid = new DataGrid()
    grid.theme = 'dark'
    grid.style.setProperty('--litgrid-color-accent', '#7c3aed')
    document.body.append(grid)

    expect(grid.style.getPropertyValue('--litgrid-color-accent')).toBe('#7c3aed')
  })
})
