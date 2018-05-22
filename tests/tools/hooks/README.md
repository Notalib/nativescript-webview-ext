# nativescript-10hook-release-info

### Add release info to the app
```
Detect app in release (production) mode or not
```

### Install
```
tns plugin add nativescript-10hook-release-info
```

### Usage

* build or prepare app
  - will create `release-info.json` in app directory
  - example
  ```
  {
      "NODE_ENV": "development",
      "release": false
  }
  ```

* in app
  ```
  const { release } = require('./release-info.json');

  console.log(release ? 'Production mode' : 'Debug mode');
  ```

* Inspired by [nativescript-hook-debug-production](https://github.com/markosko/nativescript-hook-debug-production)
