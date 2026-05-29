const { withAndroidManifest, withDangerousMods } = require('@expo/config-plugins')
const path = require('path')
const fs = require('fs')

const NSC_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
`

const withCleartextTraffic = (config) => {
  config = withDangerousMods(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/xml'
      )
      fs.mkdirSync(xmlDir, { recursive: true })
      fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), NSC_XML)
      return config
    },
  ])

  config = withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0]
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config'
    return config
  })

  return config
}

module.exports = withCleartextTraffic
