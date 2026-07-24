/**
 * elmoorx theme — يولّد ثيمات مخصصة
 * elmoorx theme <primary> [--mode=dark]
 * elmoorx theme --preset ocean
 * elmoorx theme --list
 */
import { generateTheme, getPresetTheme, listPresets, toCSSVariables, toJSObject, toTailwindConfig, saveTheme, checkContrast } from '../theme-gen/index.mjs';

export async function generateThemeCLI(args) {
  console.log(`\n  ✦ Elmoorx v4 — Theme Generator`);
  console.log(`  ─────────────────────────────────────`);

  // قائمة Presets
  if (args.includes('--list') || args.includes('-l')) {
    const presets = listPresets();
    console.log(`\n  📋 Presets المتاحة:\n`);
    for (const p of presets) {
      console.log(`    ${p.key.padEnd(20)} ${p.name} (${p.mode}) — ${p.primary}`);
    }
    console.log(`\n  الاستخدام: elmoorx theme --preset <name>`);
    return;
  }

  const presetFlag = args.find(a => a.startsWith('--preset='));
  const primaryFlag = args.find(a => a.startsWith('--primary='));
  const modeFlag = args.find(a => a.startsWith('--mode='));
  const outputFlag = args.find(a => a.startsWith('--out='));

  let theme;

  if (presetFlag) {
    const presetName = presetFlag.split('=')[1];
    theme = getPresetTheme(presetName);
    if (!theme) {
      console.error(`  ✗ preset غير معروف: ${presetName}`);
      console.error(`  شغّل: elmoorx theme --list لعرض القائمة`);
      process.exit(1);
    }
    console.log(`  │ Preset: ${presetName}`);
  } else if (primaryFlag) {
    const primary = primaryFlag.split('=')[1];
    const mode = modeFlag ? modeFlag.split('=')[1] : 'dark';
    theme = generateTheme(primary, { mode });
    console.log(`  │ Primary: ${primary}`);
    console.log(`  │ Mode: ${mode}`);
  } else {
    console.error(`  الاستخدام:`);
    console.error(`    elmoorx theme --primary=#0ea5e9 [--mode=dark]`);
    console.error(`    elmoorx theme --preset ocean`);
    console.error(`    elmoorx theme --list`);
    process.exit(1);
  }

  console.log(`  │ Name: ${theme.name}`);
  console.log(`  ─────────────────────────────────────`);

  // اعرض contrast
  console.log(`  │ Contrast (primary on background):`);
  console.log(`  │   Ratio: ${theme.contrast.primaryOnBg.ratio}:1`);
  console.log(`  │   AA: ${theme.contrast.primaryOnBg.AA ? '✓' : '✗'}`);
  console.log(`  │   AAA: ${theme.contrast.primaryOnBg.AAA ? '✓' : '✗'}`);
  console.log(`  ─────────────────────────────────────`);

  // احفظ
  const outDir = outputFlag ? outputFlag.split('=')[1] : process.cwd() + '/theme';
  const files = saveTheme(theme, outDir);
  console.log(`  │ ✓ تم الحفظ:`);
  console.log(`  │   CSS: ${files.css}`);
  console.log(`  │   JS:  ${files.js}`);
  console.log(`  │   Tailwind: ${files.tailwind}`);
  console.log(`  │   JSON: ${files.json}`);
  console.log(`  ─────────────────────────────────────\n`);
}
