Deno.serve(async (req) => {
  const assetLinks = [
    {
      "relation": [
        "delegate_permission/common.handle_all_urls",
        "delegate_permission/common.get_login_creds"
      ],
      "target": {
        "namespace": "android_app",
        "package_name": "com.base69beca883f9aef74a54f435d.app",
        "sha256_cert_fingerprints": [
          "B7:5B:33:41:01:46:16:F1:A3:66:E0:82:60:81:F4:5C:C9:6C:22:08:B6:F7:51:80:A5:30:01:C1:3B:57:1A:1A",
          "37:F3:97:C1:82:85:45:A3:04:E4:A7:46:00:B7:85:59:F4:F0:74:A8:18:42:C3:9B:4C:13:D7:DB:39:2A:D8:CA"
        ]
      }
    }
  ];

  return new Response(JSON.stringify(assetLinks, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});