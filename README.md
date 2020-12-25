# WebRTC Experiments

## Running Locally

Make sure you have a version of `node` compatible with the `engines` field in the [package.json](https://github.com/paavanb/webrtc-experiments/blob/master/package.json)

Install dependencies:
```
npm install
```

Run server:
```
npm run start
```

Optionally, run with the `https` flag to run with a self-signed SSL certificate.
```
npm run start -- --https
```

Run linters:
```
npm run test
```
