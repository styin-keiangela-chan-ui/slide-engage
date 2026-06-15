import { existsSync, readFileSync } from 'node:fs';

const requiredUrl = 'https://slide-engage.vercel.app';
const requiredTaskpane = `${requiredUrl}/taskpane`;
const requiredCommands = `${requiredUrl}/commands.html`;
const manifestFiles = [
  'public/manifest.xml',
  'public/office-addin/manifest.xml',
  'public/pptx-addin/manifest.xml',
  'office-addin/manifest.xml',
];

let failed = false;

for (const file of manifestFiles) {
  if (!existsSync(file)) {
    console.error(`Missing manifest: ${file}`);
    failed = true;
    continue;
  }

  const manifest = readFileSync(file, 'utf8');
  const checks = [
    [manifest.includes('xsi:type="TaskPaneApp"'), 'manifest must be an Office.js TaskPaneApp'],
    [manifest.includes('<Host Name="Presentation"/>'), 'base Hosts must target PowerPoint Presentation'],
    [manifest.includes('<VersionOverrides xmlns="http://schemas.microsoft.com/office/taskpaneappversionoverrides" xsi:type="VersionOverridesV1_0">'), 'manifest must include VersionOverridesV1_0'],
    [manifest.includes('<Host xsi:type="Presentation">'), 'VersionOverrides must target PowerPoint Presentation'],
    [manifest.includes('<ExtensionPoint xsi:type="PrimaryCommandSurface">'), 'manifest must define a PowerPoint command surface'],
    [manifest.includes('<CustomTab id="SlideEngageTab">'), 'manifest must add a dedicated SlideEngage ribbon tab'],
    [manifest.includes('<bt:String id="CustomTab.Label" DefaultValue="SlideEngage"/>'), 'SlideEngage custom tab must have a visible label'],
    [manifest.includes('<Action xsi:type="ShowTaskpane">'), 'manifest command must open the task pane'],
    [manifest.includes(requiredTaskpane), `SourceLocation must use ${requiredTaskpane}`],
    [manifest.includes(requiredCommands), `FunctionFile must use ${requiredCommands}`],
    [manifest.includes(`<AppDomain>${requiredUrl}</AppDomain>`), `AppDomain must include ${requiredUrl}`],
    [manifest.includes(`${requiredUrl}/assets/icons/icon-16.png`), '16px icon must use production HTTPS URL'],
    [manifest.includes(`${requiredUrl}/assets/icons/icon-32.png`), '32px icon must use production HTTPS URL'],
    [manifest.includes(`${requiredUrl}/assets/icons/icon-80.png`), '80px icon must use production HTTPS URL'],
    [manifest.includes('<Permissions>ReadWriteDocument</Permissions>'), 'permissions must be ReadWriteDocument for slide insertion'],
    [!manifest.includes('localhost'), 'manifest must not contain localhost'],
    [!manifest.includes('your-real-vercel-domain'), 'manifest must not contain placeholder domain'],
  ];

  for (const [ok, message] of checks) {
    if (!ok) {
      console.error(`${file}: ${message}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);

console.log('Office add-in manifests are production-ready.');
