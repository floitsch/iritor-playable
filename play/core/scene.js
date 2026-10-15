// include: shell.js
// include: minimum_runtime_check.js
(function() {
  // "30.0.0" -> 300000
  function humanReadableVersionToPacked(str) {
    str = str.split('-')[0]; // Remove any trailing part from e.g. "12.53.3-alpha"
    var vers = str.split('.').slice(0, 3);
    while(vers.length < 3) vers.push('00');
    vers = vers.map((n, i, arr) => n.padStart(2, '0'));
    return vers.join('');
  }
  // 300000 -> "30.0.0"
  var packedVersionToHumanReadable = n => [n / 10_000 | 0, (n / 100 | 0) % 100, n % 100].join('.');

  var TARGET_NOT_SUPPORTED = 2147483647;

  // Note: We use a typeof check here instead of optional chaining using
  // globalThis because older browsers might not have globalThis defined.

  // We skip the node version checking when running on Bun/Deno since the node
  // version they report doesn't seem to be useful.
  if (typeof process !== 'undefined' && !process.versions?.bun && typeof Deno == "undefined") {
    var currentNodeVersion = process.versions?.node ? humanReadableVersionToPacked(process.versions.node) : TARGET_NOT_SUPPORTED;
    if (currentNodeVersion < 180300) {
      throw new Error(`This emscripten-generated code requires node v${ packedVersionToHumanReadable(180300) } (detected v${packedVersionToHumanReadable(currentNodeVersion)})`);
    }
  }

  var userAgent = typeof navigator !== 'undefined' && navigator.userAgent;
  if (!userAgent) {
    return;
  }

  var currentSafariVersion = userAgent.includes("Safari/") && !userAgent.includes("Chrome/") && userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/) ? humanReadableVersionToPacked(userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentSafariVersion < 150000) {
    throw new Error(`This emscripten-generated code requires Safari v${ packedVersionToHumanReadable(150000) } (detected v${currentSafariVersion})`);
  }

  var currentFirefoxVersion = userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentFirefoxVersion < 79) {
    throw new Error(`This emscripten-generated code requires Firefox v79 (detected v${currentFirefoxVersion})`);
  }

  var currentChromeVersion = userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentChromeVersion < 85) {
    throw new Error(`This emscripten-generated code requires Chrome v85 (detected v${currentChromeVersion})`);
  }
})();

// end include: minimum_runtime_check.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module != 'undefined' ? Module : {};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = !!globalThis.window;
var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != 'renderer';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// include: /tmp/tmpah76jehf.js

  if (!Module['expectedDataFileDownloads']) Module['expectedDataFileDownloads'] = 0;
  Module['expectedDataFileDownloads']++;
  (() => {
    // Do not attempt to redownload the virtual filesystem data when in a pthread or a Wasm Worker context.
    var isPthread = typeof ENVIRONMENT_IS_PTHREAD != 'undefined' && ENVIRONMENT_IS_PTHREAD;
    var isWasmWorker = typeof ENVIRONMENT_IS_WASM_WORKER != 'undefined' && ENVIRONMENT_IS_WASM_WORKER;
    if (isPthread || isWasmWorker) return;
    var isNode = globalThis.process && globalThis.process.versions && globalThis.process.versions.node && globalThis.process.type != 'renderer';
    async function loadPackage(metadata) {

      var PACKAGE_PATH = '';
      if (typeof window === 'object') {
        PACKAGE_PATH = window['encodeURIComponent'](window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/');
      } else if (typeof process === 'undefined' && typeof location !== 'undefined') {
        // web worker
        PACKAGE_PATH = encodeURIComponent(location.pathname.substring(0, location.pathname.lastIndexOf('/')) + '/');
      }
      var PACKAGE_NAME = "scene.data";
      var REMOTE_PACKAGE_BASE = 'scene.data';
      var REMOTE_PACKAGE_NAME = Module['locateFile'] ? Module['locateFile'](REMOTE_PACKAGE_BASE, '') : REMOTE_PACKAGE_BASE;
      var REMOTE_PACKAGE_SIZE = metadata['remote_package_size'];

      async function fetchRemotePackage(packageName, packageSize) {
        if (isNode) {
          var contents = require('fs').readFileSync(packageName);
          return new Uint8Array(contents).buffer;
        }
        if (!Module['dataFileDownloads']) Module['dataFileDownloads'] = {};
        try {
          var response = await fetch(packageName);
        } catch (e) {
          throw new Error(`Network Error: ${packageName}`, {e});
        }
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.url}`);
        }

        const chunks = [];
        const headers = response.headers;
        const total = Number(headers.get('Content-Length') || packageSize);
        let loaded = 0;

        Module['setStatus'] && Module['setStatus']('Downloading data...');
        const reader = response.body.getReader();

        while (1) {
          var {done, value} = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          Module['dataFileDownloads'][packageName] = {loaded, total};

          let totalLoaded = 0;
          let totalSize = 0;

          for (const download of Object.values(Module['dataFileDownloads'])) {
            totalLoaded += download.loaded;
            totalSize += download.total;
          }

          Module['setStatus'] && Module['setStatus'](`Downloading data... (${totalLoaded}/${totalSize})`);
        }

        const packageData = new Uint8Array(chunks.map((c) => c.length).reduce((a, b) => a + b, 0));
        let offset = 0;
        for (const chunk of chunks) {
          packageData.set(chunk, offset);
          offset += chunk.length;
        }
        return packageData.buffer;
      }

      var fetchPromise;
      var fetched = Module['getPreloadedPackage'] && Module['getPreloadedPackage'](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE);

      if (!fetched) {
        // Note that we don't use await here because we want to execute the
        // the rest of this function immediately.
        fetchPromise = fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE);
      }

    async function runWithFS(Module) {

      function assert(check, msg) {
        if (!check) throw new Error(msg);
      }
Module['FS_createPath']("/", "actor", true, true);
Module['FS_createPath']("/", "armor", true, true);
Module['FS_createPath']("/", "enemy", true, true);
Module['FS_createPath']("/", "materials", true, true);
Module['FS_createPath']("/", "mutaloi", true, true);
Module['FS_createPath']("/", "scenery", true, true);
Module['FS_createPath']("/", "sky", true, true);
Module['FS_createPath']("/", "weapon", true, true);
Module['FS_createPath']("/", "world", true, true);
Module['FS_createPath']("/world", ".hack", true, true);

      async function processPackageData(arrayBuffer) {
        assert(arrayBuffer, 'Loading data file failed.');
        assert(arrayBuffer.constructor.name === ArrayBuffer.name, 'bad input to processPackageData ' + arrayBuffer.constructor.name);
        var byteArray = new Uint8Array(arrayBuffer);
        var curr;
        // Reuse the bytearray from the XHR as the source for file reads.
          for (var file of metadata['files']) {
            var name = file['filename'];
            var data = byteArray.subarray(file['start'], file['end']);
            // canOwn this data in the filesystem, it is a slice into the heap that will never change
        Module['FS_createDataFile'](name, null, data, true, true, true);
          }
          Module['removeRunDependency']('datafile_/home/flo/wootsoft/reconstruction/builds/browser-core-scene-v67/scene.data');
      }
      Module['addRunDependency']('datafile_/home/flo/wootsoft/reconstruction/builds/browser-core-scene-v67/scene.data');

      if (!Module['preloadResults']) Module['preloadResults'] = {};

      Module['preloadResults'][PACKAGE_NAME] = {fromCache: false};
      if (!fetched) {
        fetched = await fetchPromise;
      }
      await processPackageData(fetched);

    }
    // Detect whether the module JS file has already been loaded.
    if (Module['FS_createPath']) {
      runWithFS(Module);
    } else {
      if (!Module['preRun']) Module['preRun'] = [];
      Module['preRun'].push(runWithFS); // FS is not initialized yet, wait for it
    }

    }
    loadPackage({"files": [{"filename": "/actor/Extra_fmcaidle.ioa", "start": 0, "end": 885752}, {"filename": "/actor/Extra_fmcanrun.ioa", "start": 885752, "end": 932464}, {"filename": "/actor/Extra_fmcawalk.ioa", "start": 932464, "end": 970344}, {"filename": "/actor/Extra_fmcdeath.ioa", "start": 970344, "end": 1128928}, {"filename": "/actor/Extra_fmedeath.ioa", "start": 1128928, "end": 1287512}, {"filename": "/actor/Extra_fmepidle.ioa", "start": 1287512, "end": 2173264}, {"filename": "/actor/Extra_fmepirun.ioa", "start": 2173264, "end": 2219976}, {"filename": "/actor/Extra_fmepwalk.ioa", "start": 2219976, "end": 2310848}, {"filename": "/actor/Extra_fmhaidle.ioa", "start": 2310848, "end": 3196600}, {"filename": "/actor/Extra_fmhanrun.ioa", "start": 3196600, "end": 3243312}, {"filename": "/actor/Extra_fmhawalk.ioa", "start": 3243312, "end": 3334184}, {"filename": "/actor/Extra_fmhdeath.ioa", "start": 3334184, "end": 3492768}, {"filename": "/actor/Extra_fmlaidle.ioa", "start": 3492768, "end": 4378520}, {"filename": "/actor/Extra_fmlaurun.ioa", "start": 4378520, "end": 4425232}, {"filename": "/actor/Extra_fmlawalk.ioa", "start": 4425232, "end": 4516104}, {"filename": "/actor/Extra_fmldeath.ioa", "start": 4516104, "end": 4673216}, {"filename": "/actor/Extra_fmpdeath.ioa", "start": 4673216, "end": 4831800}, {"filename": "/actor/Extra_fmpiidle.ioa", "start": 4831800, "end": 5717552}, {"filename": "/actor/Extra_fmpisrun.ioa", "start": 5717552, "end": 5764264}, {"filename": "/actor/Extra_fmpiwalk.ioa", "start": 5764264, "end": 5855136}, {"filename": "/actor/Extra_fmrdeath.ioa", "start": 5855136, "end": 6013720}, {"filename": "/actor/Extra_fmrifrun.ioa", "start": 6013720, "end": 6060432}, {"filename": "/actor/Extra_fmriidle.ioa", "start": 6060432, "end": 6946184}, {"filename": "/actor/Extra_fmriwalk.ioa", "start": 6946184, "end": 7037056}, {"filename": "/actor/Extra_mcaidle_.ioa", "start": 7037056, "end": 7088624}, {"filename": "/actor/Extra_mcarun__.ioa", "start": 7088624, "end": 7139392}, {"filename": "/actor/Extra_mlaidle_.ioa", "start": 7139392, "end": 7190160}, {"filename": "/actor/Extra_mlarun__.ioa", "start": 7190160, "end": 7240928}, {"filename": "/actor/Extra_mpeidle_.ioa", "start": 7240928, "end": 7291696}, {"filename": "/actor/Extra_mperun__.ioa", "start": 7291696, "end": 7355264}, {"filename": "/actor/Extra_mriidle_.ioa", "start": 7355264, "end": 7406032}, {"filename": "/actor/Extra_mrirun__.ioa", "start": 7406032, "end": 7456800}, {"filename": "/actor/FemaleHead.dds", "start": 7456800, "end": 7981216}, {"filename": "/actor/FemaleHead.iom", "start": 7981216, "end": 8020390}, {"filename": "/actor/FemaleHead.ios", "start": 8020390, "end": 8021250}, {"filename": "/actor/FemaleHead.rgba", "start": 8021250, "end": 12215562}, {"filename": "/actor/Head.dds", "start": 12215562, "end": 13613818}, {"filename": "/actor/Head.iom", "start": 13613818, "end": 13652968}, {"filename": "/actor/Head.ios", "start": 13652968, "end": 13654216}, {"filename": "/actor/Head.rgba", "start": 13654216, "end": 17848528}, {"filename": "/actor/HumanFemale.dds", "start": 17848528, "end": 18372944}, {"filename": "/actor/HumanFemale.iom", "start": 18372944, "end": 18510470}, {"filename": "/actor/HumanFemale.ios", "start": 18510470, "end": 18517042}, {"filename": "/actor/HumanFemale.rgba", "start": 18517042, "end": 22711354}, {"filename": "/actor/HumanMale.dds", "start": 22711354, "end": 26905786}, {"filename": "/actor/HumanMale.iom", "start": 26905786, "end": 27068416}, {"filename": "/actor/HumanMale.ios", "start": 27068416, "end": 27074988}, {"filename": "/actor/HumanMale.rgba", "start": 27074988, "end": 31269300}, {"filename": "/actor/HumanMale_DIE.ioa", "start": 31269300, "end": 31440068}, {"filename": "/actor/HumanMale_IDLE.ioa", "start": 31440068, "end": 31471232}, {"filename": "/actor/HumanMale_RUN.ioa", "start": 31471232, "end": 31521200}, {"filename": "/actor/Pistol_IDLE.ioa", "start": 31521200, "end": 31571968}, {"filename": "/actor/Pistol_RUN.ioa", "start": 31571968, "end": 31622736}, {"filename": "/actor/assets.json", "start": 31622736, "end": 31674384}, {"filename": "/armor/Armor-10-0-0.dds", "start": 31674384, "end": 32373576}, {"filename": "/armor/Armor-10-0-0.iom", "start": 32373576, "end": 32398326}, {"filename": "/armor/Armor-10-0-0.ios", "start": 32398326, "end": 32400998}, {"filename": "/armor/Armor-10-0-0.rgba", "start": 32400998, "end": 36595310}, {"filename": "/armor/Armor-10-1-0.dds", "start": 36595310, "end": 37294502}, {"filename": "/armor/Armor-10-1-0.iom", "start": 37294502, "end": 37408196}, {"filename": "/armor/Armor-10-1-0.ios", "start": 37408196, "end": 37409828}, {"filename": "/armor/Armor-10-1-0.rgba", "start": 37409828, "end": 41604140}, {"filename": "/armor/Armor-10-3-0.dds", "start": 41604140, "end": 41735340}, {"filename": "/armor/Armor-10-3-0.iom", "start": 41735340, "end": 41793042}, {"filename": "/armor/Armor-10-3-0.ios", "start": 41793042, "end": 41795326}, {"filename": "/armor/Armor-10-3-0.rgba", "start": 41795326, "end": 42843910}, {"filename": "/armor/Armor-10-3-1.dds", "start": 42843910, "end": 42975110}, {"filename": "/armor/Armor-10-3-1.iom", "start": 42975110, "end": 43072868}, {"filename": "/armor/Armor-10-3-1.ios", "start": 43072868, "end": 43079960}, {"filename": "/armor/Armor-10-3-1.rgba", "start": 43079960, "end": 44128544}, {"filename": "/armor/Armor-11-0-0.dds", "start": 44128544, "end": 44827736}, {"filename": "/armor/Armor-11-0-0.iom", "start": 44827736, "end": 44855438}, {"filename": "/armor/Armor-11-0-0.ios", "start": 44855438, "end": 44858638}, {"filename": "/armor/Armor-11-0-0.rgba", "start": 44858638, "end": 49052950}, {"filename": "/armor/Armor-11-1-0.dds", "start": 49052950, "end": 49184150}, {"filename": "/armor/Armor-11-1-0.iom", "start": 49184150, "end": 49218644}, {"filename": "/armor/Armor-11-1-0.ios", "start": 49218644, "end": 49220804}, {"filename": "/armor/Armor-11-1-0.rgba", "start": 49220804, "end": 50269388}, {"filename": "/armor/Armor-11-2-0.dds", "start": 50269388, "end": 50400588}, {"filename": "/armor/Armor-11-2-0.iom", "start": 50400588, "end": 50443386}, {"filename": "/armor/Armor-11-2-0.ios", "start": 50443386, "end": 50446586}, {"filename": "/armor/Armor-11-2-0.rgba", "start": 50446586, "end": 51495170}, {"filename": "/armor/Armor-11-3-0.dds", "start": 51495170, "end": 51626370}, {"filename": "/armor/Armor-11-3-0.iom", "start": 51626370, "end": 51679464}, {"filename": "/armor/Armor-11-3-0.ios", "start": 51679464, "end": 51683312}, {"filename": "/armor/Armor-11-3-0.rgba", "start": 51683312, "end": 52731896}, {"filename": "/armor/Armor-11-3-1.dds", "start": 52731896, "end": 52863096}, {"filename": "/armor/Armor-11-3-1.iom", "start": 52863096, "end": 52915446}, {"filename": "/armor/Armor-11-3-1.ios", "start": 52915446, "end": 52919162}, {"filename": "/armor/Armor-11-3-1.rgba", "start": 52919162, "end": 53967746}, {"filename": "/armor/Armor-12-0-0.dds", "start": 53967746, "end": 54666938}, {"filename": "/armor/Armor-12-0-0.iom", "start": 54666938, "end": 54742064}, {"filename": "/armor/Armor-12-0-0.ios", "start": 54742064, "end": 54744736}, {"filename": "/armor/Armor-12-0-0.rgba", "start": 54744736, "end": 58939048}, {"filename": "/armor/Armor-12-0-1.dds", "start": 58939048, "end": 59638240}, {"filename": "/armor/Armor-12-0-1.iom", "start": 59638240, "end": 59706394}, {"filename": "/armor/Armor-12-0-1.ios", "start": 59706394, "end": 59712966}, {"filename": "/armor/Armor-12-0-1.rgba", "start": 59712966, "end": 63907278}, {"filename": "/armor/Armor-12-1-0.dds", "start": 63907278, "end": 64606470}, {"filename": "/armor/Armor-12-1-0.iom", "start": 64606470, "end": 64682976}, {"filename": "/armor/Armor-12-1-0.ios", "start": 64682976, "end": 64684868}, {"filename": "/armor/Armor-12-1-0.rgba", "start": 64684868, "end": 68879180}, {"filename": "/armor/Armor-12-3-0.dds", "start": 68879180, "end": 69010380}, {"filename": "/armor/Armor-12-3-0.iom", "start": 69010380, "end": 69087558}, {"filename": "/armor/Armor-12-3-0.ios", "start": 69087558, "end": 69090750}, {"filename": "/armor/Armor-12-3-0.rgba", "start": 69090750, "end": 70139334}, {"filename": "/armor/Armor-12-3-1.dds", "start": 70139334, "end": 70270534}, {"filename": "/armor/Armor-12-3-1.iom", "start": 70270534, "end": 70337344}, {"filename": "/armor/Armor-12-3-1.ios", "start": 70337344, "end": 70340796}, {"filename": "/armor/Armor-12-3-1.rgba", "start": 70340796, "end": 71389380}, {"filename": "/armor/Armor-9-0-0.dds", "start": 71389380, "end": 71520580}, {"filename": "/armor/Armor-9-0-0.iom", "start": 71520580, "end": 71549086}, {"filename": "/armor/Armor-9-0-0.ios", "start": 71549086, "end": 71549946}, {"filename": "/armor/Armor-9-0-0.rgba", "start": 71549946, "end": 72598530}, {"filename": "/armor/Armor-9-1-0.dds", "start": 72598530, "end": 73297722}, {"filename": "/armor/Armor-9-1-0.iom", "start": 73297722, "end": 73409880}, {"filename": "/armor/Armor-9-1-0.ios", "start": 73409880, "end": 73410740}, {"filename": "/armor/Armor-9-1-0.rgba", "start": 73410740, "end": 77605052}, {"filename": "/armor/Armor-9-2-0.dds", "start": 77605052, "end": 77736252}, {"filename": "/armor/Armor-9-2-0.iom", "start": 77736252, "end": 77788638}, {"filename": "/armor/Armor-9-2-0.ios", "start": 77788638, "end": 77789498}, {"filename": "/armor/Armor-9-2-0.rgba", "start": 77789498, "end": 78838082}, {"filename": "/armor/Armor-9-3-0.dds", "start": 78838082, "end": 78969282}, {"filename": "/armor/Armor-9-3-0.iom", "start": 78969282, "end": 78989940}, {"filename": "/armor/Armor-9-3-0.ios", "start": 78989940, "end": 78990800}, {"filename": "/armor/Armor-9-3-0.rgba", "start": 78990800, "end": 80039384}, {"filename": "/armor/Armor-9-3-1.dds", "start": 80039384, "end": 80170584}, {"filename": "/armor/Armor-9-3-1.iom", "start": 80170584, "end": 80186478}, {"filename": "/armor/Armor-9-3-1.ios", "start": 80186478, "end": 80187594}, {"filename": "/armor/Armor-9-3-1.rgba", "start": 80187594, "end": 81236178}, {"filename": "/armor/Armor-9-4-0.dds", "start": 81236178, "end": 81367378}, {"filename": "/armor/Armor-9-4-0.iom", "start": 81367378, "end": 81406984}, {"filename": "/armor/Armor-9-4-0.ios", "start": 81406984, "end": 81407844}, {"filename": "/armor/Armor-9-4-0.rgba", "start": 81407844, "end": 82456428}, {"filename": "/armor/Armor-9-5-0.dds", "start": 82456428, "end": 83155620}, {"filename": "/armor/Armor-9-5-0.iom", "start": 83155620, "end": 83183538}, {"filename": "/armor/Armor-9-5-0.ios", "start": 83183538, "end": 83184398}, {"filename": "/armor/Armor-9-5-0.rgba", "start": 83184398, "end": 87378710}, {"filename": "/armor/Armor-9-5-1.dds", "start": 87378710, "end": 87509910}, {"filename": "/armor/Armor-9-5-1.iom", "start": 87509910, "end": 87552252}, {"filename": "/armor/Armor-9-5-1.ios", "start": 87552252, "end": 87553112}, {"filename": "/armor/Armor-9-5-1.rgba", "start": 87553112, "end": 88601696}, {"filename": "/enemy/Jorgalosk.dds", "start": 88601696, "end": 89300888}, {"filename": "/enemy/Jorgalosk.iom", "start": 89300888, "end": 89517674}, {"filename": "/enemy/Jorgalosk.ios", "start": 89517674, "end": 89524246}, {"filename": "/enemy/Jorgalosk.rgba", "start": 89524246, "end": 93718558}, {"filename": "/enemy/Jorgalosk_ATTACK.ioa", "start": 93718558, "end": 93834926}, {"filename": "/enemy/Jorgalosk_DIE.ioa", "start": 93834926, "end": 94037694}, {"filename": "/enemy/Jorgalosk_IDLE.ioa", "start": 94037694, "end": 94112462}, {"filename": "/enemy/Jorgalosk_RUN.ioa", "start": 94112462, "end": 94163230}, {"filename": "/enemy/Jorgalosk_WALK.ioa", "start": 94163230, "end": 94233998}, {"filename": "/materials/basis-0.bin", "start": 94233998, "end": 94289870}, {"filename": "/materials/basis-1.bin", "start": 94289870, "end": 94303046}, {"filename": "/materials/basis-10.bin", "start": 94303046, "end": 94308422}, {"filename": "/materials/basis-11.bin", "start": 94308422, "end": 94317950}, {"filename": "/materials/basis-12.bin", "start": 94317950, "end": 94332590}, {"filename": "/materials/basis-13.bin", "start": 94332590, "end": 94346222}, {"filename": "/materials/basis-14.bin", "start": 94346222, "end": 94354766}, {"filename": "/materials/basis-15.bin", "start": 94354766, "end": 94394390}, {"filename": "/materials/basis-16.bin", "start": 94394390, "end": 94414214}, {"filename": "/materials/basis-17.bin", "start": 94414214, "end": 94448438}, {"filename": "/materials/basis-18.bin", "start": 94448438, "end": 94457990}, {"filename": "/materials/basis-19.bin", "start": 94457990, "end": 94470038}, {"filename": "/materials/basis-2.bin", "start": 94470038, "end": 94516886}, {"filename": "/materials/basis-20.bin", "start": 94516886, "end": 94532054}, {"filename": "/materials/basis-21.bin", "start": 94532054, "end": 94550438}, {"filename": "/materials/basis-22.bin", "start": 94550438, "end": 94568678}, {"filename": "/materials/basis-23.bin", "start": 94568678, "end": 94594766}, {"filename": "/materials/basis-24.bin", "start": 94594766, "end": 94618286}, {"filename": "/materials/basis-25.bin", "start": 94618286, "end": 94644542}, {"filename": "/materials/basis-26.bin", "start": 94644542, "end": 94671086}, {"filename": "/materials/basis-27.bin", "start": 94671086, "end": 94694198}, {"filename": "/materials/basis-28.bin", "start": 94694198, "end": 94704710}, {"filename": "/materials/basis-29.bin", "start": 94704710, "end": 94749494}, {"filename": "/materials/basis-3.bin", "start": 94749494, "end": 94762598}, {"filename": "/materials/basis-30.bin", "start": 94762598, "end": 94795190}, {"filename": "/materials/basis-31.bin", "start": 94795190, "end": 94818278}, {"filename": "/materials/basis-32.bin", "start": 94818278, "end": 94839950}, {"filename": "/materials/basis-33.bin", "start": 94839950, "end": 94863662}, {"filename": "/materials/basis-34.bin", "start": 94863662, "end": 94889582}, {"filename": "/materials/basis-35.bin", "start": 94889582, "end": 94912790}, {"filename": "/materials/basis-36.bin", "start": 94912790, "end": 94952990}, {"filename": "/materials/basis-37.bin", "start": 94952990, "end": 94988798}, {"filename": "/materials/basis-38.bin", "start": 94988798, "end": 95018606}, {"filename": "/materials/basis-39.bin", "start": 95018606, "end": 95348750}, {"filename": "/materials/basis-4.bin", "start": 95348750, "end": 95423270}, {"filename": "/materials/basis-40.bin", "start": 95423270, "end": 95467406}, {"filename": "/materials/basis-41.bin", "start": 95467406, "end": 95489246}, {"filename": "/materials/basis-42.bin", "start": 95489246, "end": 95497166}, {"filename": "/materials/basis-43.bin", "start": 95497166, "end": 95526974}, {"filename": "/materials/basis-44.bin", "start": 95526974, "end": 95556782}, {"filename": "/materials/basis-45.bin", "start": 95556782, "end": 95586590}, {"filename": "/materials/basis-46.bin", "start": 95586590, "end": 95598830}, {"filename": "/materials/basis-47.bin", "start": 95598830, "end": 95686982}, {"filename": "/materials/basis-48.bin", "start": 95686982, "end": 95704022}, {"filename": "/materials/basis-49.bin", "start": 95704022, "end": 95709854}, {"filename": "/materials/basis-5.bin", "start": 95709854, "end": 95849126}, {"filename": "/materials/basis-50.bin", "start": 95849126, "end": 95851646}, {"filename": "/materials/basis-51.bin", "start": 95851646, "end": 95871806}, {"filename": "/materials/basis-52.bin", "start": 95871806, "end": 95901614}, {"filename": "/materials/basis-53.bin", "start": 95901614, "end": 95939078}, {"filename": "/materials/basis-54.bin", "start": 95939078, "end": 95969894}, {"filename": "/materials/basis-55.bin", "start": 95969894, "end": 96000710}, {"filename": "/materials/basis-56.bin", "start": 96000710, "end": 96015398}, {"filename": "/materials/basis-57.bin", "start": 96015398, "end": 96026558}, {"filename": "/materials/basis-58.bin", "start": 96026558, "end": 96048326}, {"filename": "/materials/basis-6.bin", "start": 96048326, "end": 96058094}, {"filename": "/materials/basis-7.bin", "start": 96058094, "end": 96097694}, {"filename": "/materials/basis-8.bin", "start": 96097694, "end": 96115910}, {"filename": "/materials/basis-9.bin", "start": 96115910, "end": 96122870}, {"filename": "/materials/terrain-0.bin", "start": 96122870, "end": 96276470}, {"filename": "/materials/terrain-1.bin", "start": 96276470, "end": 96430070}, {"filename": "/materials/terrain-10.bin", "start": 96430070, "end": 96583670}, {"filename": "/materials/terrain-11.bin", "start": 96583670, "end": 96737270}, {"filename": "/materials/terrain-12.bin", "start": 96737270, "end": 96890870}, {"filename": "/materials/terrain-13.bin", "start": 96890870, "end": 97044470}, {"filename": "/materials/terrain-14.bin", "start": 97044470, "end": 97198070}, {"filename": "/materials/terrain-15.bin", "start": 97198070, "end": 97351670}, {"filename": "/materials/terrain-16.bin", "start": 97351670, "end": 97505270}, {"filename": "/materials/terrain-17.bin", "start": 97505270, "end": 97658870}, {"filename": "/materials/terrain-18.bin", "start": 97658870, "end": 97812470}, {"filename": "/materials/terrain-19.bin", "start": 97812470, "end": 97966070}, {"filename": "/materials/terrain-2.bin", "start": 97966070, "end": 98119670}, {"filename": "/materials/terrain-20.bin", "start": 98119670, "end": 98273270}, {"filename": "/materials/terrain-21.bin", "start": 98273270, "end": 98426870}, {"filename": "/materials/terrain-22.bin", "start": 98426870, "end": 98580470}, {"filename": "/materials/terrain-23.bin", "start": 98580470, "end": 98734070}, {"filename": "/materials/terrain-24.bin", "start": 98734070, "end": 98887670}, {"filename": "/materials/terrain-25.bin", "start": 98887670, "end": 99041270}, {"filename": "/materials/terrain-26.bin", "start": 99041270, "end": 99194870}, {"filename": "/materials/terrain-27.bin", "start": 99194870, "end": 99348470}, {"filename": "/materials/terrain-28.bin", "start": 99348470, "end": 99502070}, {"filename": "/materials/terrain-29.bin", "start": 99502070, "end": 99655670}, {"filename": "/materials/terrain-3.bin", "start": 99655670, "end": 99809270}, {"filename": "/materials/terrain-30.bin", "start": 99809270, "end": 99962870}, {"filename": "/materials/terrain-31.bin", "start": 99962870, "end": 100116470}, {"filename": "/materials/terrain-32.bin", "start": 100116470, "end": 100270070}, {"filename": "/materials/terrain-33.bin", "start": 100270070, "end": 100423670}, {"filename": "/materials/terrain-34.bin", "start": 100423670, "end": 100577270}, {"filename": "/materials/terrain-35.bin", "start": 100577270, "end": 100730870}, {"filename": "/materials/terrain-36.bin", "start": 100730870, "end": 100884470}, {"filename": "/materials/terrain-37.bin", "start": 100884470, "end": 101038070}, {"filename": "/materials/terrain-38.bin", "start": 101038070, "end": 101191670}, {"filename": "/materials/terrain-39.bin", "start": 101191670, "end": 101345270}, {"filename": "/materials/terrain-4.bin", "start": 101345270, "end": 101498870}, {"filename": "/materials/terrain-40.bin", "start": 101498870, "end": 101652470}, {"filename": "/materials/terrain-41.bin", "start": 101652470, "end": 101806070}, {"filename": "/materials/terrain-42.bin", "start": 101806070, "end": 101959670}, {"filename": "/materials/terrain-43.bin", "start": 101959670, "end": 102113270}, {"filename": "/materials/terrain-44.bin", "start": 102113270, "end": 102266870}, {"filename": "/materials/terrain-45.bin", "start": 102266870, "end": 102420470}, {"filename": "/materials/terrain-46.bin", "start": 102420470, "end": 102574070}, {"filename": "/materials/terrain-47.bin", "start": 102574070, "end": 102727670}, {"filename": "/materials/terrain-48.bin", "start": 102727670, "end": 102881270}, {"filename": "/materials/terrain-49.bin", "start": 102881270, "end": 103034870}, {"filename": "/materials/terrain-5.bin", "start": 103034870, "end": 103188470}, {"filename": "/materials/terrain-50.bin", "start": 103188470, "end": 103342070}, {"filename": "/materials/terrain-51.bin", "start": 103342070, "end": 103495670}, {"filename": "/materials/terrain-52.bin", "start": 103495670, "end": 103649270}, {"filename": "/materials/terrain-53.bin", "start": 103649270, "end": 103802870}, {"filename": "/materials/terrain-54.bin", "start": 103802870, "end": 103956470}, {"filename": "/materials/terrain-55.bin", "start": 103956470, "end": 104110070}, {"filename": "/materials/terrain-56.bin", "start": 104110070, "end": 104263670}, {"filename": "/materials/terrain-57.bin", "start": 104263670, "end": 104417270}, {"filename": "/materials/terrain-58.bin", "start": 104417270, "end": 104570870}, {"filename": "/materials/terrain-59.bin", "start": 104570870, "end": 104724470}, {"filename": "/materials/terrain-6.bin", "start": 104724470, "end": 104878070}, {"filename": "/materials/terrain-60.bin", "start": 104878070, "end": 105031670}, {"filename": "/materials/terrain-61.bin", "start": 105031670, "end": 105185270}, {"filename": "/materials/terrain-62.bin", "start": 105185270, "end": 105338870}, {"filename": "/materials/terrain-63.bin", "start": 105338870, "end": 105492470}, {"filename": "/materials/terrain-64.bin", "start": 105492470, "end": 105646070}, {"filename": "/materials/terrain-65.bin", "start": 105646070, "end": 105799670}, {"filename": "/materials/terrain-66.bin", "start": 105799670, "end": 105953270}, {"filename": "/materials/terrain-67.bin", "start": 105953270, "end": 106106870}, {"filename": "/materials/terrain-68.bin", "start": 106106870, "end": 106260470}, {"filename": "/materials/terrain-69.bin", "start": 106260470, "end": 106414070}, {"filename": "/materials/terrain-7.bin", "start": 106414070, "end": 106567670}, {"filename": "/materials/terrain-70.bin", "start": 106567670, "end": 106721270}, {"filename": "/materials/terrain-71.bin", "start": 106721270, "end": 106874870}, {"filename": "/materials/terrain-72.bin", "start": 106874870, "end": 107028470}, {"filename": "/materials/terrain-73.bin", "start": 107028470, "end": 107182070}, {"filename": "/materials/terrain-74.bin", "start": 107182070, "end": 107335670}, {"filename": "/materials/terrain-75.bin", "start": 107335670, "end": 107489270}, {"filename": "/materials/terrain-76.bin", "start": 107489270, "end": 107642870}, {"filename": "/materials/terrain-77.bin", "start": 107642870, "end": 107796470}, {"filename": "/materials/terrain-78.bin", "start": 107796470, "end": 107950070}, {"filename": "/materials/terrain-79.bin", "start": 107950070, "end": 108103670}, {"filename": "/materials/terrain-8.bin", "start": 108103670, "end": 108257270}, {"filename": "/materials/terrain-80.bin", "start": 108257270, "end": 108410870}, {"filename": "/materials/terrain-81.bin", "start": 108410870, "end": 108564470}, {"filename": "/materials/terrain-82.bin", "start": 108564470, "end": 108718070}, {"filename": "/materials/terrain-83.bin", "start": 108718070, "end": 108871670}, {"filename": "/materials/terrain-84.bin", "start": 108871670, "end": 109025270}, {"filename": "/materials/terrain-85.bin", "start": 109025270, "end": 109178870}, {"filename": "/materials/terrain-86.bin", "start": 109178870, "end": 109332470}, {"filename": "/materials/terrain-87.bin", "start": 109332470, "end": 109486070}, {"filename": "/materials/terrain-88.bin", "start": 109486070, "end": 109639670}, {"filename": "/materials/terrain-89.bin", "start": 109639670, "end": 109793270}, {"filename": "/materials/terrain-9.bin", "start": 109793270, "end": 109946870}, {"filename": "/materials/terrain-90.bin", "start": 109946870, "end": 110100470}, {"filename": "/materials/terrain-91.bin", "start": 110100470, "end": 110254070}, {"filename": "/materials/terrain-92.bin", "start": 110254070, "end": 110407670}, {"filename": "/materials/terrain-93.bin", "start": 110407670, "end": 110561270}, {"filename": "/materials/terrain-94.bin", "start": 110561270, "end": 110714870}, {"filename": "/materials/terrain-95.bin", "start": 110714870, "end": 110868470}, {"filename": "/materials/terrain-96.bin", "start": 110868470, "end": 111022070}, {"filename": "/materials/terrain-97.bin", "start": 111022070, "end": 111175670}, {"filename": "/materials/terrain-98.bin", "start": 111175670, "end": 111329270}, {"filename": "/materials/terrain-99.bin", "start": 111329270, "end": 111482870}, {"filename": "/materials/texture-0.rgba", "start": 111482870, "end": 115677182}, {"filename": "/materials/texture-1.rgba", "start": 115677182, "end": 115742726}, {"filename": "/materials/texture-10.rgba", "start": 115742726, "end": 119937038}, {"filename": "/materials/texture-100.rgba", "start": 119937038, "end": 120985622}, {"filename": "/materials/texture-101.rgba", "start": 120985622, "end": 125179934}, {"filename": "/materials/texture-102.rgba", "start": 125179934, "end": 129374246}, {"filename": "/materials/texture-103.rgba", "start": 129374246, "end": 133568558}, {"filename": "/materials/texture-104.rgba", "start": 133568558, "end": 137762870}, {"filename": "/materials/texture-11.rgba", "start": 137762870, "end": 138811454}, {"filename": "/materials/texture-12.rgba", "start": 138811454, "end": 143005766}, {"filename": "/materials/texture-13.rgba", "start": 143005766, "end": 144054350}, {"filename": "/materials/texture-14.rgba", "start": 144054350, "end": 148248662}, {"filename": "/materials/texture-15.rgba", "start": 148248662, "end": 149297246}, {"filename": "/materials/texture-16.rgba", "start": 149297246, "end": 153491558}, {"filename": "/materials/texture-17.rgba", "start": 153491558, "end": 157685870}, {"filename": "/materials/texture-18.rgba", "start": 157685870, "end": 161880182}, {"filename": "/materials/texture-19.rgba", "start": 161880182, "end": 162928766}, {"filename": "/materials/texture-2.rgba", "start": 162928766, "end": 162994310}, {"filename": "/materials/texture-20.rgba", "start": 162994310, "end": 164042894}, {"filename": "/materials/texture-21.rgba", "start": 164042894, "end": 165091478}, {"filename": "/materials/texture-22.rgba", "start": 165091478, "end": 166140062}, {"filename": "/materials/texture-23.rgba", "start": 166140062, "end": 167188646}, {"filename": "/materials/texture-24.rgba", "start": 167188646, "end": 168237230}, {"filename": "/materials/texture-25.rgba", "start": 168237230, "end": 172431542}, {"filename": "/materials/texture-26.rgba", "start": 172431542, "end": 176625854}, {"filename": "/materials/texture-27.rgba", "start": 176625854, "end": 180820166}, {"filename": "/materials/texture-28.rgba", "start": 180820166, "end": 181868750}, {"filename": "/materials/texture-29.rgba", "start": 181868750, "end": 182917334}, {"filename": "/materials/texture-3.rgba", "start": 182917334, "end": 182982878}, {"filename": "/materials/texture-30.rgba", "start": 182982878, "end": 184031462}, {"filename": "/materials/texture-31.rgba", "start": 184031462, "end": 188225774}, {"filename": "/materials/texture-32.rgba", "start": 188225774, "end": 192420086}, {"filename": "/materials/texture-33.rgba", "start": 192420086, "end": 196614398}, {"filename": "/materials/texture-34.rgba", "start": 196614398, "end": 200808710}, {"filename": "/materials/texture-35.rgba", "start": 200808710, "end": 205003022}, {"filename": "/materials/texture-36.rgba", "start": 205003022, "end": 209197334}, {"filename": "/materials/texture-37.rgba", "start": 209197334, "end": 210245918}, {"filename": "/materials/texture-38.rgba", "start": 210245918, "end": 211294502}, {"filename": "/materials/texture-39.rgba", "start": 211294502, "end": 212343086}, {"filename": "/materials/texture-4.rgba", "start": 212343086, "end": 216537398}, {"filename": "/materials/texture-40.rgba", "start": 216537398, "end": 220731710}, {"filename": "/materials/texture-41.rgba", "start": 220731710, "end": 224926022}, {"filename": "/materials/texture-42.rgba", "start": 224926022, "end": 225974606}, {"filename": "/materials/texture-43.rgba", "start": 225974606, "end": 227023190}, {"filename": "/materials/texture-44.rgba", "start": 227023190, "end": 228071774}, {"filename": "/materials/texture-45.rgba", "start": 228071774, "end": 229120358}, {"filename": "/materials/texture-46.rgba", "start": 229120358, "end": 230168942}, {"filename": "/materials/texture-47.rgba", "start": 230168942, "end": 231217526}, {"filename": "/materials/texture-48.rgba", "start": 231217526, "end": 232266110}, {"filename": "/materials/texture-49.rgba", "start": 232266110, "end": 233314694}, {"filename": "/materials/texture-5.rgba", "start": 233314694, "end": 237509006}, {"filename": "/materials/texture-50.rgba", "start": 237509006, "end": 241703318}, {"filename": "/materials/texture-51.rgba", "start": 241703318, "end": 245897630}, {"filename": "/materials/texture-52.rgba", "start": 245897630, "end": 250091942}, {"filename": "/materials/texture-53.rgba", "start": 250091942, "end": 254286254}, {"filename": "/materials/texture-54.rgba", "start": 254286254, "end": 258480566}, {"filename": "/materials/texture-55.rgba", "start": 258480566, "end": 262674878}, {"filename": "/materials/texture-56.rgba", "start": 262674878, "end": 266869190}, {"filename": "/materials/texture-57.rgba", "start": 266869190, "end": 271063502}, {"filename": "/materials/texture-58.rgba", "start": 271063502, "end": 272112086}, {"filename": "/materials/texture-59.rgba", "start": 272112086, "end": 273160670}, {"filename": "/materials/texture-6.rgba", "start": 273160670, "end": 277354982}, {"filename": "/materials/texture-60.rgba", "start": 277354982, "end": 278403566}, {"filename": "/materials/texture-61.rgba", "start": 278403566, "end": 279452150}, {"filename": "/materials/texture-62.rgba", "start": 279452150, "end": 280500734}, {"filename": "/materials/texture-63.rgba", "start": 280500734, "end": 281549318}, {"filename": "/materials/texture-64.rgba", "start": 281549318, "end": 282597902}, {"filename": "/materials/texture-65.rgba", "start": 282597902, "end": 283646486}, {"filename": "/materials/texture-66.rgba", "start": 283646486, "end": 284695070}, {"filename": "/materials/texture-67.rgba", "start": 284695070, "end": 285743654}, {"filename": "/materials/texture-68.rgba", "start": 285743654, "end": 286792238}, {"filename": "/materials/texture-69.rgba", "start": 286792238, "end": 287840822}, {"filename": "/materials/texture-7.rgba", "start": 287840822, "end": 292035134}, {"filename": "/materials/texture-70.rgba", "start": 292035134, "end": 293083718}, {"filename": "/materials/texture-71.rgba", "start": 293083718, "end": 294132302}, {"filename": "/materials/texture-72.rgba", "start": 294132302, "end": 295180886}, {"filename": "/materials/texture-73.rgba", "start": 295180886, "end": 296229470}, {"filename": "/materials/texture-74.rgba", "start": 296229470, "end": 297278054}, {"filename": "/materials/texture-75.rgba", "start": 297278054, "end": 298326638}, {"filename": "/materials/texture-76.rgba", "start": 298326638, "end": 299375222}, {"filename": "/materials/texture-77.rgba", "start": 299375222, "end": 300423806}, {"filename": "/materials/texture-78.rgba", "start": 300423806, "end": 301472390}, {"filename": "/materials/texture-79.rgba", "start": 301472390, "end": 302520974}, {"filename": "/materials/texture-8.rgba", "start": 302520974, "end": 306715286}, {"filename": "/materials/texture-80.rgba", "start": 306715286, "end": 307763870}, {"filename": "/materials/texture-81.rgba", "start": 307763870, "end": 308812454}, {"filename": "/materials/texture-82.rgba", "start": 308812454, "end": 313006766}, {"filename": "/materials/texture-83.rgba", "start": 313006766, "end": 317201078}, {"filename": "/materials/texture-84.rgba", "start": 317201078, "end": 321395390}, {"filename": "/materials/texture-85.rgba", "start": 321395390, "end": 325589702}, {"filename": "/materials/texture-86.rgba", "start": 325589702, "end": 329784014}, {"filename": "/materials/texture-87.rgba", "start": 329784014, "end": 333978326}, {"filename": "/materials/texture-88.rgba", "start": 333978326, "end": 338172638}, {"filename": "/materials/texture-89.rgba", "start": 338172638, "end": 342366950}, {"filename": "/materials/texture-9.rgba", "start": 342366950, "end": 346561262}, {"filename": "/materials/texture-90.rgba", "start": 346561262, "end": 346565366}, {"filename": "/materials/texture-91.rgba", "start": 346565366, "end": 350759678}, {"filename": "/materials/texture-92.rgba", "start": 350759678, "end": 354953990}, {"filename": "/materials/texture-93.rgba", "start": 354953990, "end": 359148302}, {"filename": "/materials/texture-94.rgba", "start": 359148302, "end": 363342614}, {"filename": "/materials/texture-95.rgba", "start": 363342614, "end": 367536926}, {"filename": "/materials/texture-96.rgba", "start": 367536926, "end": 368585510}, {"filename": "/materials/texture-97.rgba", "start": 368585510, "end": 369634094}, {"filename": "/materials/texture-98.rgba", "start": 369634094, "end": 370682678}, {"filename": "/materials/texture-99.rgba", "start": 370682678, "end": 371731262}, {"filename": "/mutaloi/Mutaloi.dds", "start": 371731262, "end": 372430454}, {"filename": "/mutaloi/Mutaloi.iom", "start": 372430454, "end": 372834776}, {"filename": "/mutaloi/Mutaloi.ios", "start": 372834776, "end": 372841348}, {"filename": "/mutaloi/Mutaloi.rgba", "start": 372841348, "end": 377035660}, {"filename": "/mutaloi/Mutaloi_ATTACK.ioa", "start": 377035660, "end": 377061972}, {"filename": "/mutaloi/Mutaloi_DIE.ioa", "start": 377061972, "end": 377125436}, {"filename": "/mutaloi/Mutaloi_IDLE.ioa", "start": 377125436, "end": 377161252}, {"filename": "/mutaloi/Mutaloi_RUN.ioa", "start": 377161252, "end": 377177196}, {"filename": "/mutaloi/Mutaloi_WALK.ioa", "start": 377177196, "end": 377193140}, {"filename": "/scenery/bonsa01c.rgba", "start": 377193140, "end": 381387452}, {"filename": "/scenery/bonsa01m.iom", "start": 381387452, "end": 382090490}, {"filename": "/scenery/bonsa02m.iom", "start": 382090490, "end": 382185876}, {"filename": "/scenery/bonsa03c.rgba", "start": 382185876, "end": 386380188}, {"filename": "/scenery/bunkerc.rgba", "start": 386380188, "end": 390574500}, {"filename": "/scenery/bunkerm.iom", "start": 390574500, "end": 390621054}, {"filename": "/scenery/crossiantreecrown.iom", "start": 390621054, "end": 390638956}, {"filename": "/scenery/crossiantreecrown_c.rgba", "start": 390638956, "end": 394833268}, {"filename": "/scenery/lianen_c.rgba", "start": 394833268, "end": 399027580}, {"filename": "/scenery/lianencroissanttreedi.iom", "start": 399027580, "end": 399054338}, {"filename": "/scenery/longtree.iom", "start": 399054338, "end": 399121044}, {"filename": "/scenery/longtree_c.rgba", "start": 399121044, "end": 403315356}, {"filename": "/scenery/minib01c.rgba", "start": 403315356, "end": 407509668}, {"filename": "/scenery/minib01m.iom", "start": 407509668, "end": 407697414}, {"filename": "/scenery/minib02m.iom", "start": 407697414, "end": 407734334}, {"filename": "/scenery/minib03c.rgba", "start": 407734334, "end": 411928646}, {"filename": "/scenery/monol01m.iom", "start": 411928646, "end": 411941280}, {"filename": "/scenery/monol02m.iom", "start": 411941280, "end": 411946822}, {"filename": "/scenery/monolt2c.rgba", "start": 411946822, "end": 416141134}, {"filename": "/scenery/monoltc.rgba", "start": 416141134, "end": 420335446}, {"filename": "/scenery/moreltrm.iom", "start": 420335446, "end": 420380660}, {"filename": "/scenery/mrltreec.rgba", "start": 420380660, "end": 421429244}, {"filename": "/scenery/tongu01m.iom", "start": 421429244, "end": 421513466}, {"filename": "/scenery/tongu02m.iom", "start": 421513466, "end": 421582728}, {"filename": "/scenery/tongu03m.iom", "start": 421582728, "end": 421615630}, {"filename": "/scenery/tongu04m.iom", "start": 421615630, "end": 421640612}, {"filename": "/scenery/tonguec.rgba", "start": 421640612, "end": 422689196}, {"filename": "/scenery/twist01m.iom", "start": 422689196, "end": 422736956}, {"filename": "/scenery/twstbrkc.rgba", "start": 422736956, "end": 423785540}, {"filename": "/sky/Cloud1.iom", "start": 423785540, "end": 423792086}, {"filename": "/sky/Cloud2.iom", "start": 423792086, "end": 423798632}, {"filename": "/sky/Dome.iom", "start": 423798632, "end": 423814178}, {"filename": "/sky/sky2.dds", "start": 423814178, "end": 425212406}, {"filename": "/sky/sky2.rgba", "start": 425212406, "end": 426260990}, {"filename": "/sky/sky_cloudplane.dds", "start": 426260990, "end": 427659218}, {"filename": "/sky/sky_cloudplane.rgba", "start": 427659218, "end": 428707802}, {"filename": "/weapon/Automag.dds", "start": 428707802, "end": 428839002}, {"filename": "/weapon/Automag.iom", "start": 428839002, "end": 428863552}, {"filename": "/weapon/Automag.rgba", "start": 428863552, "end": 429912136}, {"filename": "/weapon/Weapon-0-1.dds", "start": 429912136, "end": 430043336}, {"filename": "/weapon/Weapon-0-1.iom", "start": 430043336, "end": 430139658}, {"filename": "/weapon/Weapon-0-1.rgba", "start": 430139658, "end": 431188242}, {"filename": "/weapon/Weapon-0-2.dds", "start": 431188242, "end": 431319442}, {"filename": "/weapon/Weapon-0-2.iom", "start": 431319442, "end": 431390376}, {"filename": "/weapon/Weapon-0-2.rgba", "start": 431390376, "end": 432438960}, {"filename": "/weapon/Weapon-1-0.dds", "start": 432438960, "end": 432570160}, {"filename": "/weapon/Weapon-1-0.iom", "start": 432570160, "end": 432622194}, {"filename": "/weapon/Weapon-1-0.rgba", "start": 432622194, "end": 433670778}, {"filename": "/weapon/Weapon-1-1.dds", "start": 433670778, "end": 433801978}, {"filename": "/weapon/Weapon-1-1.iom", "start": 433801978, "end": 433850684}, {"filename": "/weapon/Weapon-1-1.rgba", "start": 433850684, "end": 434899268}, {"filename": "/weapon/Weapon-1-2.dds", "start": 434899268, "end": 435030468}, {"filename": "/weapon/Weapon-1-2.iom", "start": 435030468, "end": 435085038}, {"filename": "/weapon/Weapon-1-2.rgba", "start": 435085038, "end": 436133622}, {"filename": "/weapon/Weapon-1-3.dds", "start": 436133622, "end": 436264822}, {"filename": "/weapon/Weapon-1-3.iom", "start": 436264822, "end": 436322936}, {"filename": "/weapon/Weapon-1-3.rgba", "start": 436322936, "end": 437371520}, {"filename": "/weapon/Weapon-2-0.dds", "start": 437371520, "end": 437502720}, {"filename": "/weapon/Weapon-2-0.iom", "start": 437502720, "end": 437552910}, {"filename": "/weapon/Weapon-2-0.rgba", "start": 437552910, "end": 438601494}, {"filename": "/weapon/Weapon-3-0.dds", "start": 438601494, "end": 438732694}, {"filename": "/weapon/Weapon-3-0.iom", "start": 438732694, "end": 438817012}, {"filename": "/weapon/Weapon-3-0.rgba", "start": 438817012, "end": 439865596}, {"filename": "/weapon/Weapon-3-1.dds", "start": 439865596, "end": 441263852}, {"filename": "/weapon/Weapon-3-1.iom", "start": 441263852, "end": 441344114}, {"filename": "/weapon/Weapon-3-1.rgba", "start": 441344114, "end": 445538426}, {"filename": "/weapon/Weapon-4-0.dds", "start": 445538426, "end": 446237618}, {"filename": "/weapon/Weapon-4-0.iom", "start": 446237618, "end": 446304492}, {"filename": "/weapon/Weapon-4-0.rgba", "start": 446304492, "end": 450498804}, {"filename": "/world/.hack/currentWorld.tga", "start": 450498804, "end": 451285280}, {"filename": "/world/layer0.rgba", "start": 451285280, "end": 455479592}, {"filename": "/world/layer1.rgba", "start": 455479592, "end": 459673904}, {"filename": "/world/layer2.rgba", "start": 459673904, "end": 463868216}, {"filename": "/world/layer3.rgba", "start": 463868216, "end": 468062528}, {"filename": "/world/parameters.inc", "start": 468062528, "end": 468062902}, {"filename": "/world/ter0.iom", "start": 468062902, "end": 468496222}, {"filename": "/world/ter1.iom", "start": 468496222, "end": 468929542}, {"filename": "/world/ter10.iom", "start": 468929542, "end": 469362862}, {"filename": "/world/ter11.iom", "start": 469362862, "end": 469796182}, {"filename": "/world/ter12.iom", "start": 469796182, "end": 470229502}, {"filename": "/world/ter13.iom", "start": 470229502, "end": 470662822}, {"filename": "/world/ter14.iom", "start": 470662822, "end": 471096142}, {"filename": "/world/ter15.iom", "start": 471096142, "end": 471529462}, {"filename": "/world/ter16.iom", "start": 471529462, "end": 471962782}, {"filename": "/world/ter17.iom", "start": 471962782, "end": 472396102}, {"filename": "/world/ter18.iom", "start": 472396102, "end": 472829422}, {"filename": "/world/ter19.iom", "start": 472829422, "end": 473262742}, {"filename": "/world/ter2.iom", "start": 473262742, "end": 473696062}, {"filename": "/world/ter20.iom", "start": 473696062, "end": 474129382}, {"filename": "/world/ter21.iom", "start": 474129382, "end": 474562702}, {"filename": "/world/ter22.iom", "start": 474562702, "end": 474996022}, {"filename": "/world/ter23.iom", "start": 474996022, "end": 475429342}, {"filename": "/world/ter24.iom", "start": 475429342, "end": 475862662}, {"filename": "/world/ter25.iom", "start": 475862662, "end": 476295982}, {"filename": "/world/ter26.iom", "start": 476295982, "end": 476729302}, {"filename": "/world/ter27.iom", "start": 476729302, "end": 477162622}, {"filename": "/world/ter28.iom", "start": 477162622, "end": 477595942}, {"filename": "/world/ter29.iom", "start": 477595942, "end": 478029262}, {"filename": "/world/ter3.iom", "start": 478029262, "end": 478462582}, {"filename": "/world/ter30.iom", "start": 478462582, "end": 478895902}, {"filename": "/world/ter31.iom", "start": 478895902, "end": 479329222}, {"filename": "/world/ter32.iom", "start": 479329222, "end": 479762542}, {"filename": "/world/ter33.iom", "start": 479762542, "end": 480195862}, {"filename": "/world/ter34.iom", "start": 480195862, "end": 480629182}, {"filename": "/world/ter35.iom", "start": 480629182, "end": 481062502}, {"filename": "/world/ter36.iom", "start": 481062502, "end": 481495822}, {"filename": "/world/ter37.iom", "start": 481495822, "end": 481929142}, {"filename": "/world/ter38.iom", "start": 481929142, "end": 482362462}, {"filename": "/world/ter39.iom", "start": 482362462, "end": 482795782}, {"filename": "/world/ter4.iom", "start": 482795782, "end": 483229102}, {"filename": "/world/ter40.iom", "start": 483229102, "end": 483662422}, {"filename": "/world/ter41.iom", "start": 483662422, "end": 484095742}, {"filename": "/world/ter42.iom", "start": 484095742, "end": 484529062}, {"filename": "/world/ter43.iom", "start": 484529062, "end": 484962382}, {"filename": "/world/ter44.iom", "start": 484962382, "end": 485395702}, {"filename": "/world/ter45.iom", "start": 485395702, "end": 485829022}, {"filename": "/world/ter46.iom", "start": 485829022, "end": 486262342}, {"filename": "/world/ter47.iom", "start": 486262342, "end": 486695662}, {"filename": "/world/ter48.iom", "start": 486695662, "end": 487128982}, {"filename": "/world/ter49.iom", "start": 487128982, "end": 487562302}, {"filename": "/world/ter5.iom", "start": 487562302, "end": 487995622}, {"filename": "/world/ter50.iom", "start": 487995622, "end": 488428942}, {"filename": "/world/ter51.iom", "start": 488428942, "end": 488862262}, {"filename": "/world/ter52.iom", "start": 488862262, "end": 489295582}, {"filename": "/world/ter53.iom", "start": 489295582, "end": 489728902}, {"filename": "/world/ter54.iom", "start": 489728902, "end": 490162222}, {"filename": "/world/ter55.iom", "start": 490162222, "end": 490595542}, {"filename": "/world/ter56.iom", "start": 490595542, "end": 491028862}, {"filename": "/world/ter57.iom", "start": 491028862, "end": 491462182}, {"filename": "/world/ter58.iom", "start": 491462182, "end": 491895502}, {"filename": "/world/ter59.iom", "start": 491895502, "end": 492328822}, {"filename": "/world/ter6.iom", "start": 492328822, "end": 492762142}, {"filename": "/world/ter60.iom", "start": 492762142, "end": 493195462}, {"filename": "/world/ter61.iom", "start": 493195462, "end": 493628782}, {"filename": "/world/ter62.iom", "start": 493628782, "end": 494062102}, {"filename": "/world/ter63.iom", "start": 494062102, "end": 494495422}, {"filename": "/world/ter64.iom", "start": 494495422, "end": 494928742}, {"filename": "/world/ter65.iom", "start": 494928742, "end": 495362062}, {"filename": "/world/ter66.iom", "start": 495362062, "end": 495795382}, {"filename": "/world/ter67.iom", "start": 495795382, "end": 496228702}, {"filename": "/world/ter68.iom", "start": 496228702, "end": 496662022}, {"filename": "/world/ter69.iom", "start": 496662022, "end": 497095342}, {"filename": "/world/ter7.iom", "start": 497095342, "end": 497528662}, {"filename": "/world/ter70.iom", "start": 497528662, "end": 497961982}, {"filename": "/world/ter71.iom", "start": 497961982, "end": 498395302}, {"filename": "/world/ter72.iom", "start": 498395302, "end": 498828622}, {"filename": "/world/ter73.iom", "start": 498828622, "end": 499261942}, {"filename": "/world/ter74.iom", "start": 499261942, "end": 499695262}, {"filename": "/world/ter75.iom", "start": 499695262, "end": 500128582}, {"filename": "/world/ter76.iom", "start": 500128582, "end": 500561902}, {"filename": "/world/ter77.iom", "start": 500561902, "end": 500995222}, {"filename": "/world/ter78.iom", "start": 500995222, "end": 501428542}, {"filename": "/world/ter79.iom", "start": 501428542, "end": 501861862}, {"filename": "/world/ter8.iom", "start": 501861862, "end": 502295182}, {"filename": "/world/ter80.iom", "start": 502295182, "end": 502728502}, {"filename": "/world/ter81.iom", "start": 502728502, "end": 503161822}, {"filename": "/world/ter82.iom", "start": 503161822, "end": 503595142}, {"filename": "/world/ter83.iom", "start": 503595142, "end": 504028462}, {"filename": "/world/ter84.iom", "start": 504028462, "end": 504461782}, {"filename": "/world/ter85.iom", "start": 504461782, "end": 504895102}, {"filename": "/world/ter86.iom", "start": 504895102, "end": 505328422}, {"filename": "/world/ter87.iom", "start": 505328422, "end": 505761742}, {"filename": "/world/ter88.iom", "start": 505761742, "end": 506195062}, {"filename": "/world/ter89.iom", "start": 506195062, "end": 506628382}, {"filename": "/world/ter9.iom", "start": 506628382, "end": 507061702}, {"filename": "/world/ter90.iom", "start": 507061702, "end": 507495022}, {"filename": "/world/ter91.iom", "start": 507495022, "end": 507928342}, {"filename": "/world/ter92.iom", "start": 507928342, "end": 508361662}, {"filename": "/world/ter93.iom", "start": 508361662, "end": 508794982}, {"filename": "/world/ter94.iom", "start": 508794982, "end": 509228302}, {"filename": "/world/ter95.iom", "start": 509228302, "end": 509661622}, {"filename": "/world/ter96.iom", "start": 509661622, "end": 510094942}, {"filename": "/world/ter97.iom", "start": 510094942, "end": 510528262}, {"filename": "/world/ter98.iom", "start": 510528262, "end": 510961582}, {"filename": "/world/ter99.iom", "start": 510961582, "end": 511394902}], "remote_package_size": 511394902});

  })();

// end include: /tmp/tmpah76jehf.js
// include: /tmp/tmplrtlkw_n.js

    // All the pre-js content up to here must remain later on, we need to run
    // it.
    if ((typeof ENVIRONMENT_IS_WASM_WORKER != 'undefined' && ENVIRONMENT_IS_WASM_WORKER) || (typeof ENVIRONMENT_IS_PTHREAD != 'undefined' && ENVIRONMENT_IS_PTHREAD) || (typeof ENVIRONMENT_IS_AUDIO_WORKLET != 'undefined' && ENVIRONMENT_IS_AUDIO_WORKLET)) Module['preRun'] = [];
    var necessaryPreJSTasks = Module['preRun'].slice();
  // end include: /tmp/tmplrtlkw_n.js
// include: /tmp/tmp3dlqrm4e.js

    if (!Module['preRun']) throw 'Module.preRun should exist because file support used it; did a pre-js delete it?';
    necessaryPreJSTasks.forEach((task) => {
      if (Module['preRun'].indexOf(task) < 0) throw 'All preRun tasks that exist before user pre-js code should remain after; did you replace Module or modify Module.preRun?';
    });
  // end include: /tmp/tmp3dlqrm4e.js


var programArgs = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

// In MODULARIZE mode _scriptName needs to be captured already at the very top of the page immediately when the page is parsed, so it is generated there
// before the page load. In non-MODULARIZE modes generate it here.
var _scriptName = globalThis.document?.currentScript?.src;

if (typeof __filename != 'undefined') { // Node
  _scriptName = __filename;
} else
if (ENVIRONMENT_IS_WORKER) {
  _scriptName = self.location.href;
}

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var readAsync, readBinary;

if (ENVIRONMENT_IS_NODE) {
  const isNode = globalThis.process?.versions?.node && globalThis.process?.type != 'renderer';
  if (!isNode) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  var fs = require('node:fs');

  scriptDirectory = __dirname + '/';

// include: node_shell_read.js
readBinary = (filename) => {
  // We need to re-wrap `file://` strings to URLs.
  filename = isFileURI(filename) ? new URL(filename) : filename;
  var ret = fs.readFileSync(filename);
  assert(Buffer.isBuffer(ret));
  return ret;
};

readAsync = async (filename, binary = true) => {
  // See the comment in the `readBinary` function.
  filename = isFileURI(filename) ? new URL(filename) : filename;
  var ret = fs.readFileSync(filename, binary ? undefined : 'utf8');
  assert(binary ? Buffer.isBuffer(ret) : typeof ret == 'string');
  return ret;
};
// end include: node_shell_read.js
  if (process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, '/');
  }

  programArgs = process.argv.slice(2);

  // MODULARIZE will export the module in the proper place outside, we don't need to export here
  if (typeof module != 'undefined') {
    module['exports'] = Module;
  }

  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };

} else
if (ENVIRONMENT_IS_SHELL) {

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  try {
    scriptDirectory = new URL('.', _scriptName).href; // includes trailing slash
  } catch {
    // Must be a `blob:` or `data:` URL (e.g. `blob:http://site.com/etc/etc`), we cannot
    // infer anything from them.
  }

  if (!(globalThis.window || globalThis.WorkerGlobalScope)) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  {
// include: web_or_worker_shell_read.js
if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
    };
  }

  readAsync = async (url) => {
    // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
    // See https://github.com/github/fetch/pull/92#issuecomment-140665932
    // Cordova or Electron apps are typically loaded from a file:// url.
    // So use XHR on webview if URL is a file URL.
    if (isFileURI(url)) {
      return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            resolve(xhr.response);
            return;
          }
          reject(xhr.status);
        };
        xhr.onerror = reject;
        xhr.send(null);
      });
    }
    var response = await fetch(url, { credentials: 'same-origin' });
    if (response.ok) {
      return response.arrayBuffer();
    }
    throw new Error(response.status + ' : ' + response.url);
  };
// end include: web_or_worker_shell_read.js
  }
} else
{
  throw new Error('environment detection error');
}

var out = console.log.bind(console);
var err = console.error.bind(console);

var IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js';
var PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js';
var WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js';
var FETCHFS = 'FETCHFS is no longer included by default; build with -lfetchfs.js';
var ICASEFS = 'ICASEFS is no longer included by default; build with -licasefs.js';
var JSFILEFS = 'JSFILEFS is no longer included by default; build with -ljsfilefs.js';
var OPFS = 'OPFS is no longer included by default; build with -lopfs.js';

var NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js';

// perform assertions in shell.js after we set up out() and err(), as otherwise
// if an assertion fails it cannot print the message

assert(!ENVIRONMENT_IS_SHELL, 'shell environment detected but not enabled at build time (add `shell` to `-sENVIRONMENT` to enable)');

// end include: shell.js

// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary;

if (!globalThis.WebAssembly) {
  err('no native wasm support detected');
}

// Wasm globals

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed' + (text ? ': ' + text : ''));
  }
}

// We used to include malloc/free by default in the past. Show a helpful error in
// builds with assertions.

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
var isFileURI = (filename) => filename.startsWith('file://');

// include: runtime_common.js
// include: runtime_exceptions.js
// Base Emscripten EH error class
class EmscriptenEH extends Error {}

class EmscriptenSjLj extends EmscriptenEH {}

class CppException extends EmscriptenEH {
  constructor(excPtr) {
    super(excPtr);
    this.excPtr = excPtr;
    const excInfo = getExceptionMessage(this);
    this.name = excInfo[0];
    this.message = excInfo[1];
  }
}

// end include: runtime_exceptions.js
// include: runtime_debug.js
var runtimeDebug = true; // Switch to false at runtime to disable logging at the right times

// Used by XXXXX_DEBUG settings to output debug messages.
function dbg(...args) {
  if (!runtimeDebug && typeof runtimeDebug != 'undefined') return;
  // TODO(sbc): Make this configurable somehow.  Its not always convenient for
  // logging to show up as warnings.
  console.warn(...args);
}

// Endianness check
(() => {
  var h16 = new Int16Array(1);
  var h8 = new Int8Array(h16.buffer);
  h16[0] = 0x6373;
  if (h8[0] !== 0x73 || h8[1] !== 0x63) abort('Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)');
})();

function consumedModuleProp(prop) {
  var value = Module[prop];
  var msg = `Attempt to modify \`Module.${prop}\` after it has already been processed.  This can happen, for example, when code is injected via '--post-js' rather than '--pre-js'`;
  if (Array.isArray(value)) {
    value = new Proxy(value, {
      set(target, key, val) {
        abort(msg);
        return false;
      },
      defineProperty(target, key, descriptor) {
        abort(msg);
        return false;
      },
      deleteProperty(target, key) {
        abort(msg);
        return false;
      }
    });
  }
  Object.defineProperty(Module, prop, {
    configurable: true,
    get() { return value; },
    set() {
      abort(msg);
    }
  });
}

function makeInvalidEarlyAccess(name) {
  return () => assert(false, `call to '${name}' via reference taken before Wasm module initialization`);

}

function ignoredModuleProp(prop) {
  if (Object.getOwnPropertyDescriptor(Module, prop)) {
    abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
  }
}

// forcing the filesystem exports a few things by default
function isExportedByForceFilesystem(name) {
  return name === 'FS_createPath' ||
         name === 'FS_createDataFile' ||
         name === 'FS_createPreloadedFile' ||
         name === 'FS_preloadFile' ||
         name === 'FS_unlink' ||
         name === 'addRunDependency' ||
         // The old FS has some functionality that WasmFS lacks.
         name === 'FS_createLazyFile' ||
         name === 'FS_createDevice' ||
         name === 'removeRunDependency';
}

/**
 * Intercept access to a symbols in the global symbol.  This enables us to give
 * informative warnings/errors when folks attempt to use symbols they did not
 * include in their build, or no symbols that no longer exist.
 *
 * We don't define this in MODULARIZE mode since in that mode emscripten symbols
 * are never placed in the global scope.
 */
function hookGlobalSymbolAccess(sym, func) {
  if (!Object.getOwnPropertyDescriptor(globalThis, sym)) {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get() {
        func();
        return undefined;
      }
    });
  }
}

function missingGlobal(sym, msg) {
  hookGlobalSymbolAccess(sym, () => {
    warnOnce(`\`${sym}\` is no longer defined by emscripten. ${msg}`);
  });
}

missingGlobal('buffer', 'Please use HEAP8.buffer or wasmMemory.buffer');
missingGlobal('asm', 'Please use wasmExports instead');

function missingLibrarySymbol(sym) {
  hookGlobalSymbolAccess(sym, () => {
    // Can't `abort()` here because it would break code that does runtime
    // checks.  e.g. `if (typeof SDL === 'undefined')`.
    var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
    // DEFAULT_LIBRARY_FUNCS_TO_INCLUDE requires the name as it appears in
    // library.js, which means $name for a JS name with no prefix, or name
    // for a JS name like _name.
    var librarySymbol = sym;
    if (!librarySymbol.startsWith('_')) {
      librarySymbol = '$' + sym;
    }
    msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
    if (isExportedByForceFilesystem(sym)) {
      msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
    }
    warnOnce(msg);
  });

  // Any symbol that is not included from the JS library is also (by definition)
  // not exported on the Module object.
  unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
  if (!Object.getOwnPropertyDescriptor(Module, sym)) {
    Object.defineProperty(Module, sym, {
      configurable: true,
      get() {
        var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        abort(msg);
      },
    });
  }
}

// end include: runtime_debug.js
// include: runtime_stack_check.js
const stackCookie1 = 0x02135467;
const stackCookie2 = 0x89BACDFE;

// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  var max = _emscripten_stack_get_end();
  assert((max & 3) == 0);
  // If the stack ends at address zero we write our cookies 4 bytes into the
  // stack.  This prevents interference with SAFE_HEAP and ASAN which also
  // monitor writes to address zero.
  if (max == 0) {
    max += 4;
  }
  // The stack grow downwards towards _emscripten_stack_get_end.
  // We write cookies to the final two words in the stack and detect if they are
  // ever overwritten.
  HEAPU32[((max)>>2)] = stackCookie1;
  HEAPU32[(((max)+(4))>>2)] = stackCookie2;
  // Also test the global address 0 for integrity.
  HEAPU32[((0)>>2)] = 1668509029;
}

function u32ToHexString(num) {
  return '0x' + (num >>> 0).toString(16).padStart(8, '0');
}

function checkStackCookie() {
  if (ABORT) return;
  var max = _emscripten_stack_get_end();
  // See writeStackCookie().
  if (max == 0) {
    max += 4;
  }
  var val1 = HEAPU32[((max)>>2)];
  var val2 = HEAPU32[(((max)+(4))>>2)];
  if (val1 != stackCookie1 || val2 != stackCookie2) {
    abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords ${u32ToHexString(stackCookie2)} and ${u32ToHexString(stackCookie1)}, but received ${u32ToHexString(val2)} ${u32ToHexString(val1)}`);
  }
  // Also test the global address 0 for integrity.
  if (HEAPU32[((0)>>2)] != 0x63736d65 /* 'emsc' */) {
    abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
  }
}
// end include: runtime_stack_check.js
// Memory management

var runtimeInitialized = false;



// When ALLOW_MEMORY_GROWTH is enabled, the conversion from Wasm
// memory to ArrayBuffer requires some additional logic.
function getMemoryBuffer() {
  return wasmMemory.buffer;
}

function updateMemoryViews() {
  // If we already have a heap that is resizeable/growable buffer we don't
  // need to do anything in updateMemoryViews.
  if (HEAP8?.buffer?.resizable) return;
  var b = getMemoryBuffer();
  HEAP8 = new Int8Array(b);
  HEAP16 = new Int16Array(b);
  HEAPU8 = new Uint8Array(b);
  HEAPU16 = new Uint16Array(b);
  HEAP32 = new Int32Array(b);
  HEAPU32 = new Uint32Array(b);
  HEAPF32 = new Float32Array(b);
  
  HEAP64 = new BigInt64Array(b);
  
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// end include: runtime_common.js
assert(globalThis.Int32Array && globalThis.Float64Array && Int32Array.prototype.subarray && Int32Array.prototype.set,
       'JS engine does not provide full typed array support');

function preRun() {
  var preRun = Module['preRun'];
  if (preRun) {
    if (typeof preRun == 'function') preRun = [preRun];
    onPreRuns.push(...preRun);
  }
  consumedModuleProp('preRun');
  // Begin ATPRERUNS hooks
  callRuntimeCallbacks(onPreRuns);
  // End ATPRERUNS hooks
}

function initRuntime() {
  assert(!runtimeInitialized);
  runtimeInitialized = true;

  checkStackCookie();

  // Begin ATINITS hooks
  if (!Module['noFSInit'] && !FS.initialized) FS.init();
TTY.init();
  // End ATINITS hooks

  wasmExports['__wasm_call_ctors']();

  // Begin ATPOSTCTORS hooks
  FS.ignorePermissions = false;
  // End ATPOSTCTORS hooks

  checkStackCookie();
}

function postRun() {
  checkStackCookie();

  var postRun = Module['postRun'];
  if (postRun) {
    if (typeof postRun == 'function') postRun = [postRun];
    onPostRuns.push(...postRun);
  }
  consumedModuleProp('postRun');

  // Begin ATPOSTRUNS hooks
  callRuntimeCallbacks(onPostRuns);
  // End ATPOSTRUNS hooks
}

/**
 * @param {string|number=} what
 */
function abort(what) {
  Module['onAbort']?.(what);

  what = `Aborted(${what})`;
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */
  var e = new WebAssembly.RuntimeError(what);

  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

function createExportWrapper(name, func, nargs) {
  assert(func);
  return (...args) => {
    assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
    // Only assert for too many arguments. Too few can be valid since the missing arguments will be zero filled.
    assert(args.length <= nargs, `native function \`${name}\` called with ${args.length} args but expects ${nargs}`);
    return func(...args);
  };
}

var wasmBinaryFile;

function findWasmBinary() {
  return locateFile('scene.wasm');
}

function getBinarySync(file) {
  if (readBinary) {
    return readBinary(file);
  }
  // Throwing a plain string here, even though it not normally advisable since
  // this gets turning into an `abort` in instantiateArrayBuffer.
  throw 'both async and sync fetching of the wasm failed';
}

async function getWasmBinary(binaryFile) {
  // If we don't have the binary yet, load it asynchronously using readAsync.
  if (!wasmBinary) {
    // Fetch the binary using readAsync
    try {
      var response = await readAsync(binaryFile);
      return new Uint8Array(response);
    } catch {
      // Fall back to getBinarySync below;
    }
  }

  // Otherwise, getBinarySync should be able to get it synchronously
  return getBinarySync(binaryFile);
}

async function instantiateArrayBuffer(binaryFile, imports) {
  try {
    var binary = await getWasmBinary(binaryFile);
    var instance = await WebAssembly.instantiate(binary, imports);
    return instance;
  } catch (reason) {
    err(`failed to asynchronously prepare wasm: ${reason}`);

    // Warn on some common problems.
    if (isFileURI(binaryFile)) {
      err(`warning: Loading from a file URI (${binaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
    }
    abort(reason);
  }
}

async function instantiateAsync(binary, binaryFile, imports) {
  if (!binary
      // Don't use streaming for file:// delivered objects in a webview, fetch them synchronously.
      && !isFileURI(binaryFile)
      // Avoid using instantiateStreaming() on Node.js since the `fetch()` API
      // does not support `file://` URLs.
      // See: https://github.com/emscripten-core/emscripten/pull/16917
      && !ENVIRONMENT_IS_NODE
     ) {
    try {
      var response = fetch(binaryFile, { credentials: 'same-origin' });
      var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
      return instantiationResult;
    } catch (reason) {
      // We expect the most common failure cause to be a bad MIME type for the binary,
      // in which case falling back to ArrayBuffer instantiation should work.
      err(`wasm streaming compile failed: ${reason}`);
      err('falling back to ArrayBuffer instantiation');
      // fall back of instantiateArrayBuffer below
    };
  }
  return instantiateArrayBuffer(binaryFile, imports);
}

function getWasmImports() {
  // prepare imports
  var imports = {
    'env': wasmImports,
    'wasi_snapshot_preview1': wasmImports,
  };
  return imports;
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
async function createWasm() {
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  function receiveInstance(instance) {
    wasmExports = instance.exports;

    assignWasmExports(wasmExports);

    updateMemoryViews();

    return wasmExports;
  }

  // Prefer streaming instantiation if available.
  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  var trueModule = Module;
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
    trueModule = null;
    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
    // When the regression is fixed, can restore the above PTHREADS-enabled path.
    return receiveInstance(result['instance']);
  }

  var info = getWasmImports();

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  var instantiateWasm = Module['instantiateWasm'];
  if (instantiateWasm) {
    return new Promise((resolve) => {
      try {
        instantiateWasm(info, (inst) => resolve(receiveInstance(inst)));
      } catch(e) {
        err(`Module.instantiateWasm callback failed with error: ${e}`);
        throw e;
      }
    });
  }

  wasmBinaryFile ??= findWasmBinary();
  var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
  var exports = receiveInstantiationResult(result);
  return exports;
}

// end include: preamble.js

// Begin JS library code


  class ExitStatus {
      name = 'ExitStatus';
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }

  /** @type {!Int32Array} */
  var HEAP32;

  /** @type {!Int8Array} */
  var HEAP8;

  /** @type {!Uint32Array} */
  var HEAPU32;

  var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    };
  var onPostRuns = [];
  var addOnPostRun = (cb) => onPostRuns.push(cb);

  var onPreRuns = [];
  var addOnPreRun = (cb) => onPreRuns.push(cb);


  var noExitRuntime = true;

  function ptrToString(ptr) {
      assert(typeof ptr === 'number', `ptrToString expects a number, got ${typeof ptr}`);
      // Convert to 32-bit unsigned value
      ptr >>>= 0;
      return '0x' + ptr.toString(16).padStart(8, '0');
    }

  var stackRestore = (val) => __emscripten_stack_restore(val);

  var stackSave = () => _emscripten_stack_get_current();

  var warnOnce = (text) => {
      warnOnce.shown ||= {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = 'warning: ' + text;
        err(text);
      }
    };

  

  var UTF8Decoder = globalThis.TextDecoder && new TextDecoder();
  
  
    /**
   * heapOrArray is either a regular array, or a JavaScript typed array view.
   * @param {number} idx
   * @param {number=} maxBytesToRead
   * @param {boolean=} ignoreNul
   * @return {number}
   */
  var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
      var maxIdx = idx + maxBytesToRead;
      if (ignoreNul) return maxIdx;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on
      // null terminator by itself.
      // As a tiny code save trick, compare idx against maxIdx using a negation,
      // so that maxBytesToRead=undefined/NaN means Infinity.
      while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
      return idx;
    };
  
  
    /**
   * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
   * array that contains uint8 values, returns a copy of that string as a
   * Javascript String object.
   * heapOrArray is either a regular array, or a JavaScript typed array view.
   * @param {number=} idx
   * @param {number=} maxBytesToRead
   * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
   * @return {string}
   */
  var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
  
      var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
  
      // When using conditional TextDecoder, skip it for short strings as the overhead of the native call is not worth it.
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = '';
      while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = heapOrArray[idx++];
        if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 0xF0) == 0xE0) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          if ((u0 & 0xF8) != 0xF0) warnOnce(`Invalid UTF-8 leading byte ${ptrToString(u0)} encountered when deserializing a UTF-8 string in wasm memory to a JS string!`);
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }
  
        if (u0 < 0x10000) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        }
      }
      return str;
    };
  
  /** @type {!Uint8Array} */
  var HEAPU8;
  
    /**
   * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
   * emscripten HEAP, returns a copy of that string as a Javascript String object.
   *
   * @param {number} ptr
   * @param {number=} maxBytesToRead - An optional length that specifies the
   *   maximum number of bytes to read. You can omit this parameter to scan the
   *   string until the first 0 byte. If maxBytesToRead is passed, and the string
   *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
   *   string will cut short at that byte index.
   * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
   * @return {string}
   */
  var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => {
      assert(typeof ptr == 'number', `UTF8ToString expects a number (got ${typeof ptr})`);
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : '';
    };
  var ___assert_fail = (condition, filename, line, func) =>
      abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [filename ? UTF8ToString(filename) : 'unknown filename', line, func ? UTF8ToString(func) : 'unknown function']);

  var exceptionCaught =  [];
  
  
  var uncaughtExceptionCount = 0;
  
  
  class ExceptionInfo {
      // excPtr - Thrown object pointer to wrap. Metadata pointer is calculated from it.
      constructor(excPtr) {
        this.excPtr = excPtr;
        this.ptr = excPtr - 24;
      }
  
      set_type(type) {
        HEAPU32[(((this.ptr)+(4))>>2)] = type;
      }
  
      get_type() {
        return HEAPU32[(((this.ptr)+(4))>>2)];
      }
  
      set_destructor(destructor) {
        HEAPU32[(((this.ptr)+(8))>>2)] = destructor;
      }
  
      get_destructor() {
        return HEAPU32[(((this.ptr)+(8))>>2)];
      }
  
      set_caught(caught) {
        caught = caught ? 1 : 0;
        HEAP8[(this.ptr)+(12)] = caught;
      }
  
      get_caught() {
        return HEAP8[(this.ptr)+(12)] != 0;
      }
  
      set_rethrown(rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[(this.ptr)+(13)] = rethrown;
      }
  
      get_rethrown() {
        return HEAP8[(this.ptr)+(13)] != 0;
      }
  
      // Initialize native structure fields. Should be called once after allocated.
      init(type, destructor) {
        this.set_adjusted_ptr(0);
        this.set_type(type);
        this.set_destructor(destructor);
      }
  
      set_adjusted_ptr(adjustedPtr) {
        HEAPU32[(((this.ptr)+(16))>>2)] = adjustedPtr;
      }
  
      get_adjusted_ptr() {
        return HEAPU32[(((this.ptr)+(16))>>2)];
      }
    }
  var ___cxa_begin_catch = (ptr) => {
      var info = new ExceptionInfo(ptr);
      if (!info.get_caught()) {
        info.set_caught(true);
        uncaughtExceptionCount--;
      }
      info.set_rethrown(false);
      exceptionCaught.push(info);
      return ___cxa_get_exception_ptr(ptr);
    };

  var ___cxa_call_unexpected = (exception) => abort('Unexpected exception thrown, this is not properly supported - aborting');

  
  
  
  var exceptionLast = null;
  var ___cxa_end_catch = () => {
      // Clear state flag.
      _setThrew(0, 0);
      assert(exceptionCaught.length > 0);
      // Call destructor if one is registered then clear it.
      var info = exceptionCaught.pop();
  
      ___cxa_decrement_exception_refcount(info.excPtr);
      exceptionLast = null; // XXX in decRef?
    };

  var setTempRet0 = (val) => __emscripten_tempret_set(val);
  
  
  
  var findMatchingCatch = (args) => {
      var thrown = exceptionLast?.excPtr;
      if (!thrown) {
        // just pass through the null ptr
        setTempRet0(0);
        return 0;
      }
      var info = new ExceptionInfo(thrown);
      info.set_adjusted_ptr(thrown);
      var thrownType = info.get_type();
      if (!thrownType) {
        // just pass through the thrown ptr
        setTempRet0(0);
        return thrown;
      }
  
      // can_catch receives a **, add indirection
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var caughtType of args) {
        if (!caughtType || caughtType === thrownType) {
          // Catch all clause matched or exactly the same type is caught
          break;
        }
        var adjusted_ptr_addr = info.ptr + 16;
        if (___cxa_can_catch(caughtType, thrownType, adjusted_ptr_addr)) {
          setTempRet0(caughtType);
          return thrown;
        }
      }
      setTempRet0(thrownType);
      return thrown;
    };
  var ___cxa_find_matching_catch_2 = () => findMatchingCatch([]);

  var ___cxa_find_matching_catch_3 = (arg0) => findMatchingCatch([arg0]);

  
  
  
  
  var __Unwind_RaiseException = (ex) => {
      throw ex;
    };
  var ___cxa_rethrow = () => {
      if (!exceptionCaught.length) {
        abort('no exception to throw');
      }
      var info = exceptionCaught.at(-1);
      var ptr = info.excPtr;
      info.set_rethrown(true);
      info.set_caught(false);
      uncaughtExceptionCount++;
      ___cxa_increment_exception_refcount(ptr);
      ptr = exceptionLast = new CppException(ptr);
      __Unwind_RaiseException(ptr);
    };

  
  
  
  
  
  
  
  
  var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
  
  
  var getExceptionMessageCommon = (ptr) => {
      var sp = stackSave();
      var type_addr_addr = stackAlloc(4);
      var message_addr_addr = stackAlloc(4);
      ___get_exception_message(ptr, type_addr_addr, message_addr_addr);
      var type_addr = HEAPU32[((type_addr_addr)>>2)];
      var message_addr = HEAPU32[((message_addr_addr)>>2)];
      var type = UTF8ToString(type_addr);
      _free(type_addr);
      var message;
      if (message_addr) {
        message = UTF8ToString(message_addr);
        _free(message_addr);
      }
      stackRestore(sp);
      return [type, message];
    };
  var getExceptionMessage = (exn) => getExceptionMessageCommon(exn.excPtr);
  
  var decrementExceptionRefcount = (exn) => ___cxa_decrement_exception_refcount(exn.excPtr);
  
  var incrementExceptionRefcount = (exn) => ___cxa_increment_exception_refcount(exn.excPtr);
  
  var ___cxa_throw = (ptr, type, destructor) => {
      var info = new ExceptionInfo(ptr);
      // Initialize ExceptionInfo content after it was allocated in __cxa_allocate_exception.
      info.init(type, destructor);
      ___cxa_increment_exception_refcount(ptr);
      ptr = exceptionLast = new CppException(ptr);
      uncaughtExceptionCount++;
      __Unwind_RaiseException(ptr);
    };

  var ___cxa_uncaught_exceptions = () => uncaughtExceptionCount;

  
  var __Unwind_Resume = (ex) => {
      throw ex;
    };
  var ___resumeException = (ptr) => {
      ptr = exceptionLast ??= new CppException(ptr);
      __Unwind_Resume(ptr);
    };

  var syscallGetVarargI = () => {
      assert(SYSCALLS.varargs != undefined);
      // the `+` prepended here is necessary to convince the JSCompiler that varargs is indeed a number.
      var ret = HEAP32[((+SYSCALLS.varargs)>>2)];
      SYSCALLS.varargs += 4;
      return ret;
    };
  var syscallGetVarargP = syscallGetVarargI;
  
  
  var PATH = {
  isAbs:(path) => path.charAt(0) === '/',
  splitPath:(filename) => {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },
  normalizeArray:(parts, allowAboveRoot) => {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },
  normalize:(path) => {
        var isAbsolute = PATH.isAbs(path),
            trailingSlash = path.slice(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter((p) => !!p), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },
  dirname:(path) => {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.slice(0, -1);
        }
        return root + dir;
      },
  basename:(path) => path && path.match(/([^\/]+|\/)\/*$/)[1],
join:(...paths) => PATH.normalize(paths.join('/')),
join2:(l, r) => PATH.normalize(l + '/' + r),
};

var initRandomFill = () => {
    // This block is not needed on v19+ since crypto.getRandomValues is builtin
    if (ENVIRONMENT_IS_NODE) {
      var nodeCrypto = require('node:crypto');
      return (view) => (nodeCrypto.randomFillSync(view), 0);
    }

    return (view) => (crypto.getRandomValues(view), 0);
  };
var randomFill = (view) => (randomFill = initRandomFill())(view);



var PATH_FS = {
resolve:(...args) => {
      var resolvedPath = '',
        resolvedAbsolute = false;
      for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        var path = (i >= 0) ? args[i] : FS.cwd();
        // Skip empty and invalid entries
        if (typeof path != 'string') {
          throw new TypeError('Arguments to path.resolve must be strings');
        } else if (!path) {
          return ''; // an invalid portion invalidates the whole thing
        }
        resolvedPath = path + '/' + resolvedPath;
        resolvedAbsolute = PATH.isAbs(path);
      }
      // At this point the path should be resolved to a full absolute path, but
      // handle relative paths to be safe (might happen when process.cwd() fails)
      resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter((p) => !!p), !resolvedAbsolute).join('/');
      return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
    },
relative:(from, to) => {
      from = PATH_FS.resolve(from).slice(1);
      to = PATH_FS.resolve(to).slice(1);
      function trim(arr) {
        var start = 0;
        for (; start < arr.length; start++) {
          if (arr[start] !== '') break;
        }
        var end = arr.length - 1;
        for (; end >= 0; end--) {
          if (arr[end] !== '') break;
        }
        if (start > end) return [];
        return arr.slice(start, end - start + 1);
      }
      var fromParts = trim(from.split('/'));
      var toParts = trim(to.split('/'));
      var length = Math.min(fromParts.length, toParts.length);
      var samePartsLength = length;
      for (var i = 0; i < length; i++) {
        if (fromParts[i] !== toParts[i]) {
          samePartsLength = i;
          break;
        }
      }
      var outputParts = [];
      for (var i = samePartsLength; i < fromParts.length; i++) {
        outputParts.push('..');
      }
      outputParts = outputParts.concat(toParts.slice(samePartsLength));
      return outputParts.join('/');
    },
};



var FS_stdin_getChar_buffer = [];

var lengthBytesUTF8 = (str) => {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
      // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
      // unit, not a Unicode code point of the character! So decode
      // UTF16->UTF32->UTF8.
      // See http://unicode.org/faq/utf_bom.html#utf16-3
      var c = str.charCodeAt(i); // possibly a lead surrogate
      if (c <= 0x7F) {
        len++;
      } else if (c <= 0x7FF) {
        len += 2;
      } else if (c >= 0xD800 && c <= 0xDFFF) {
        len += 4; ++i;
      } else {
        len += 3;
      }
    }
    return len;
  };

var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
    assert(typeof str === 'string', `stringToUTF8Array expects a string (got ${typeof str})`);
    // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
    // undefined and false each don't write out any bytes.
    if (!(maxBytesToWrite > 0))
      return 0;

    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
    for (var i = 0; i < str.length; ++i) {
      // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
      // and https://www.ietf.org/rfc/rfc2279.txt
      // and https://tools.ietf.org/html/rfc3629
      var u = str.codePointAt(i);
      if (u <= 0x7F) {
        if (outIdx >= endIdx) break;
        heap[outIdx++] = u;
      } else if (u <= 0x7FF) {
        if (outIdx + 1 >= endIdx) break;
        heap[outIdx++] = 0xC0 | (u >> 6);
        heap[outIdx++] = 0x80 | (u & 63);
      } else if (u <= 0xFFFF) {
        if (outIdx + 2 >= endIdx) break;
        heap[outIdx++] = 0xE0 | (u >> 12);
        heap[outIdx++] = 0x80 | ((u >> 6) & 63);
        heap[outIdx++] = 0x80 | (u & 63);
      } else {
        if (outIdx + 3 >= endIdx) break;
        if (u > 0x10FFFF) warnOnce(`Invalid Unicode code point ${ptrToString(u)} encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).`);
        heap[outIdx++] = 0xF0 | (u >> 18);
        heap[outIdx++] = 0x80 | ((u >> 12) & 63);
        heap[outIdx++] = 0x80 | ((u >> 6) & 63);
        heap[outIdx++] = 0x80 | (u & 63);
        // Gotcha: if codePoint is over 0xFFFF, it is represented as a surrogate pair in UTF-16.
        // We need to manually skip over the second code unit for correct iteration.
        i++;
      }
    }
    // Null-terminate the pointer to the buffer.
    heap[outIdx] = 0;
    return outIdx - startIdx;
  };
/** @type {function(string, boolean=, number=)} */
  var intArrayFromString = (stringy, dontAddNull, length) => {
      var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      if (dontAddNull) u8array.length = numBytesWritten;
      return u8array;
    };
  var FS_stdin_getChar = () => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (ENVIRONMENT_IS_NODE) {
          // we will read data by chunks of BUFSIZE
          var BUFSIZE = 256;
          var buf = Buffer.alloc(BUFSIZE);
          var bytesRead = 0;
  
          try {
            bytesRead = fs.readSync(process.stdin.fd, buf, 0, BUFSIZE);
          } catch(e) {
            // Cross-platform differences: on Windows, reading EOF throws an
            // exception, but on other OSes, reading EOF returns 0. Uniformize
            // behavior by treating the EOF exception to return 0.
            if (e.toString().includes('EOF')) bytesRead = 0;
            else throw e;
          }
  
          if (bytesRead > 0) {
            result = buf.toString('utf-8', 0, bytesRead);
          }
        } else
        if (globalThis.window?.prompt) {
          // Browser.
          result = window.prompt('Input: ');  // returns null on cancel
          if (result !== null) {
            result += '\n';
          }
        } else
        {}
        if (!result) {
          return null;
        }
        FS_stdin_getChar_buffer = intArrayFromString(result, true);
      }
      return FS_stdin_getChar_buffer.shift();
    };
  var TTY = {
  ttys:[],
  init() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process.stdin.setEncoding('utf8');
        // }
      },
  shutdown() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process.stdin.pause();
        // }
      },
  register(dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },
  stream_ops:{
  open(stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(43);
          }
          stream.tty = tty;
          stream.seekable = false;
        },
  close(stream) {
          // flush any pending line data
          stream.tty.ops.fsync(stream.tty);
        },
  fsync(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
  read(stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(60);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === undefined && !bytesRead) {
              throw new FS.ErrnoError(6);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
            // We currently only support canonical mode (ICANON), where
            // read(2) returns as soon as a line delimiter is read.
            if (result === 10) break;
          }
          if (bytesRead) {
            stream.node.atime = Date.now();
          }
          return bytesRead;
        },
  write(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(60);
          }
          try {
            for (var i = 0; i < length; i++) {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            }
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) {
            stream.node.mtime = stream.node.ctime = Date.now();
          }
          return i;
        },
  },
  default_tty_ops:{
  get_char(tty) {
          return FS_stdin_getChar();
        },
  put_char(tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },
  fsync(tty) {
          if (tty.output?.length > 0) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
  ioctl_tcgets(tty) {
          // typical setting
          return {
            c_iflag: 25856,
            c_oflag: 5,
            c_cflag: 191,
            c_lflag: 35387,
            c_cc: [
              0x03, 0x1c, 0x7f, 0x15, 0x04, 0x00, 0x01, 0x00, 0x11, 0x13, 0x1a, 0x00,
              0x12, 0x0f, 0x17, 0x16, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
              0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ]
          };
        },
  ioctl_tcsets(tty, optional_actions, data) {
          // currently just ignore
          return 0;
        },
  ioctl_tiocgwinsz(tty) {
          return [24, 80];
        },
  },
  default_tty1_ops:{
  put_char(tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
  fsync(tty) {
          if (tty.output?.length > 0) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
  },
  };
  
  
  var mmapAlloc = (size) => {
      abort('internal error: mmapAlloc called but `emscripten_builtin_memalign` native symbol not exported');
    };
  
  var MEMFS = {
  ops_table:null,
  mount(mount) {
        return MEMFS.createNode(null, '/', 16895, 0);
      },
  createNode(parent, name, mode, dev = undefined) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // not supported
          throw new FS.ErrnoError(63);
        }
        MEMFS.ops_table ||= {
          dir: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              lookup: MEMFS.node_ops.lookup,
              mknod: MEMFS.node_ops.mknod,
              rename: MEMFS.node_ops.rename,
              unlink: MEMFS.node_ops.unlink,
              rmdir: MEMFS.node_ops.rmdir,
              readdir: MEMFS.node_ops.readdir,
              symlink: MEMFS.node_ops.symlink
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek
            }
          },
          file: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek,
              read: MEMFS.stream_ops.read,
              write: MEMFS.stream_ops.write,
              mmap: MEMFS.stream_ops.mmap,
              msync: MEMFS.stream_ops.msync
            }
          },
          link: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              readlink: MEMFS.node_ops.readlink
            },
            stream: {}
          },
          chrdev: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: FS.chrdev_stream_ops
          }
        };
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          // The actual number of bytes used in the typed array, as opposed to
          // contents.length which gives the whole capacity.
          node.usedBytes = 0;
          // The byte data of the file is stored in a typed array.
          // Note: typed arrays are not resizable like normal JS arrays are, so
          // there is a small penalty involved for appending file writes that
          // continuously grow a file similar to std::vector capacity vs used.
          node.contents = MEMFS.emptyFileContents ??= new Uint8Array(0);
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.atime = node.mtime = node.ctime = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
          parent.atime = parent.mtime = parent.ctime = node.atime;
        }
        return node;
      },
  getFileDataAsTypedArray(node) {
        assert(FS.isFile(node.mode), 'getFileDataAsTypedArray called on non-file');
        return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
      },
  expandFileStorage(node, newCapacity) {
        var prevCapacity = node.contents.length;
        if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
        // Don't expand strictly to the given requested limit if it's only a very
        // small increase, but instead geometrically grow capacity.
        // For small filesizes (<1MB), perform size*2 geometric increase, but for
        // large sizes, do a much more conservative size*1.125 increase to avoid
        // overshooting the allocation cap by a very large margin.
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) >>> 0);
        if (prevCapacity) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
        var oldContents = MEMFS.getFileDataAsTypedArray(node);
        node.contents = new Uint8Array(newCapacity); // Allocate new storage.
        node.contents.set(oldContents);
      },
  resizeFileStorage(node, newSize) {
        if (node.usedBytes == newSize) return;
        var oldContents = node.contents;
        node.contents = new Uint8Array(newSize); // Allocate new storage.
        node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
        node.usedBytes = newSize;
      },
  node_ops:{
  getattr(node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.atime);
          attr.mtime = new Date(node.mtime);
          attr.ctime = new Date(node.ctime);
          // A Date only holds whole milliseconds: also return the exact times
          // (e.g. as set by utimensat), which SYSCALLS.writeStat prefers.
          attr.atimeMs = node.atime;
          attr.mtimeMs = node.mtime;
          attr.ctimeMs = node.ctime;
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },
  setattr(node, attr) {
          for (const key of ['mode', 'atime', 'mtime', 'ctime']) {
            if (attr[key] != null) {
              node[key] = attr[key];
            }
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },
  lookup(parent, name) {
          throw new FS.ErrnoError(44);
        },
  mknod(parent, name, mode, dev = undefined) {
          return MEMFS.createNode(parent, name, mode, dev);
        },
  rename(old_node, new_dir, new_name) {
          var new_node;
          try {
            new_node = FS.lookupNode(new_dir, new_name);
          } catch (e) {}
          if (new_node && FS.isDir(old_node.mode)) {
            // if we're overwriting a directory at new_name, make sure it's empty.
            for (var i in new_node.contents) {
              throw new FS.ErrnoError(55);
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          new_dir.contents[new_name] = old_node;
          old_node.name = new_name;
          new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
        },
  unlink(parent, name) {
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
  rmdir(parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(55);
          }
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
  readdir(node) {
          return ['.', '..', ...Object.keys(node.contents)];
        },
  symlink(parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 0o777 | 40960, 0);
          node.link = oldpath;
          return node;
        },
  readlink(node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(28);
          }
          return node.link;
        },
  },
  stream_ops:{
  read(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          buffer.set(contents.subarray(position, position + size), offset);
          return size;
        },
  write(stream, buffer, offset, length, position, canOwn) {
          assert(buffer.subarray, 'FS.write expects a TypedArray');
          // If the buffer is located in main memory (HEAP), and if
          // memory can grow, we can't hold on to references of the
          // memory buffer, as they may get invalidated. That means we
          // need to copy its contents.
          if (buffer.buffer === HEAP8.buffer) {
            canOwn = false;
          }
  
          if (!length) return 0;
          var node = stream.node;
          node.mtime = node.ctime = Date.now();
  
          if (canOwn) {
            assert(!position, 'canOwn must imply no weird position inside the file');
            node.contents = buffer.subarray(offset, offset + length);
            node.usedBytes = length;
          } else if (!node.usedBytes && !position) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
            node.contents = buffer.slice(offset, offset + length);
            node.usedBytes = length;
          } else {
            MEMFS.expandFileStorage(node, position+length);
            // Use typed array write which is available.
            node.contents.set(buffer.subarray(offset, offset + length), position);
            node.usedBytes = Math.max(node.usedBytes, position + length);
          }
          return length;
        },
  llseek(stream, offset, whence) {
          var position = offset;
          if (whence === 1) {
            position += stream.position;
          } else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(28);
          }
          return position;
        },
  mmap(stream, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
            // We can't emulate MAP_SHARED when the file is not backed by the
            // buffer we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            allocated = true;
            ptr = mmapAlloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(48);
            }
            if (contents) {
              // Try to avoid unnecessary slices.
              if (position > 0 || position + length < contents.length) {
                if (contents.subarray) {
                  contents = contents.subarray(position, position + length);
                } else {
                  contents = Array.prototype.slice.call(contents, position, position + length);
                }
              }
              HEAP8.set(contents, ptr);
            }
          }
          return { ptr, allocated };
        },
  msync(stream, buffer, offset, length, mmapFlags) {
          MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        },
  },
  };
  
  var FS_modeStringToFlags = (str) => {
      if (typeof str != 'string') return str;
      var flagModes = {
        'r': 0,
        'r+': 2,
        'w': 512 | 64 | 1,
        'w+': 512 | 64 | 2,
        'a': 1024 | 64 | 1,
        'a+': 1024 | 64 | 2,
      };
      var flags = flagModes[str];
      if (typeof flags == 'undefined') {
        throw new Error(`Unknown file open mode: ${str}`);
      }
      return flags;
    };
  
  var FS_fileDataToTypedArray = (data) => {
      if (typeof data == 'string') {
        data = intArrayFromString(data, true);
      }
      if (!data.subarray) {
        data = new Uint8Array(data);
      }
      return data;
    };
  
  var FS_getMode = (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    };
  
  
  
  
  var strError = (errno) => UTF8ToString(_strerror(errno));
  
  var ERRNO_CODES = {
      'EPERM': 63,
      'ENOENT': 44,
      'ESRCH': 71,
      'EINTR': 27,
      'EIO': 29,
      'ENXIO': 60,
      'E2BIG': 1,
      'ENOEXEC': 45,
      'EBADF': 8,
      'ECHILD': 12,
      'EAGAIN': 6,
      'EWOULDBLOCK': 6,
      'ENOMEM': 48,
      'EACCES': 2,
      'EFAULT': 21,
      'ENOTBLK': 105,
      'EBUSY': 10,
      'EEXIST': 20,
      'EXDEV': 75,
      'ENODEV': 43,
      'ENOTDIR': 54,
      'EISDIR': 31,
      'EINVAL': 28,
      'ENFILE': 41,
      'EMFILE': 33,
      'ENOTTY': 59,
      'ETXTBSY': 74,
      'EFBIG': 22,
      'ENOSPC': 51,
      'ESPIPE': 70,
      'EROFS': 69,
      'EMLINK': 34,
      'EPIPE': 64,
      'EDOM': 18,
      'ERANGE': 68,
      'ENOMSG': 49,
      'EIDRM': 24,
      'ECHRNG': 106,
      'EL2NSYNC': 156,
      'EL3HLT': 107,
      'EL3RST': 108,
      'ELNRNG': 109,
      'EUNATCH': 110,
      'ENOCSI': 111,
      'EL2HLT': 112,
      'EDEADLK': 16,
      'ENOLCK': 46,
      'EBADE': 113,
      'EBADR': 114,
      'EXFULL': 115,
      'ENOANO': 104,
      'EBADRQC': 103,
      'EBADSLT': 102,
      'EDEADLOCK': 16,
      'EBFONT': 101,
      'ENOSTR': 100,
      'ENODATA': 116,
      'ETIME': 117,
      'ENOSR': 118,
      'ENONET': 119,
      'ENOPKG': 120,
      'EREMOTE': 121,
      'ENOLINK': 47,
      'EADV': 122,
      'ESRMNT': 123,
      'ECOMM': 124,
      'EPROTO': 65,
      'EMULTIHOP': 36,
      'EDOTDOT': 125,
      'EBADMSG': 9,
      'ENOTUNIQ': 126,
      'EBADFD': 127,
      'EREMCHG': 128,
      'ELIBACC': 129,
      'ELIBBAD': 130,
      'ELIBSCN': 131,
      'ELIBMAX': 132,
      'ELIBEXEC': 133,
      'ENOSYS': 52,
      'ENOTEMPTY': 55,
      'ENAMETOOLONG': 37,
      'ELOOP': 32,
      'EOPNOTSUPP': 138,
      'EPFNOSUPPORT': 139,
      'ECONNRESET': 15,
      'ENOBUFS': 42,
      'EAFNOSUPPORT': 5,
      'EPROTOTYPE': 67,
      'ENOTSOCK': 57,
      'ENOPROTOOPT': 50,
      'ESHUTDOWN': 140,
      'ECONNREFUSED': 14,
      'EADDRINUSE': 3,
      'ECONNABORTED': 13,
      'ENETUNREACH': 40,
      'ENETDOWN': 38,
      'ETIMEDOUT': 73,
      'EHOSTDOWN': 142,
      'EHOSTUNREACH': 23,
      'EINPROGRESS': 26,
      'EALREADY': 7,
      'EDESTADDRREQ': 17,
      'EMSGSIZE': 35,
      'EPROTONOSUPPORT': 66,
      'ESOCKTNOSUPPORT': 137,
      'EADDRNOTAVAIL': 4,
      'ENETRESET': 39,
      'EISCONN': 30,
      'ENOTCONN': 53,
      'ETOOMANYREFS': 141,
      'EUSERS': 136,
      'EDQUOT': 19,
      'ESTALE': 72,
      'ENOTSUP': 138,
      'ENOMEDIUM': 148,
      'EILSEQ': 25,
      'EOVERFLOW': 61,
      'ECANCELED': 11,
      'ENOTRECOVERABLE': 56,
      'EOWNERDEAD': 62,
      'ESTRPIPE': 135,
    };
  
  
  var asyncLoad = async (url) => {
      var arrayBuffer = await readAsync(url);
      assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
      return new Uint8Array(arrayBuffer);
    };
  
  
  var FS_createDataFile = (...args) => FS.createDataFile(...args);
  
  var getUniqueRunDependency = (id) => {
      var orig = id;
      while (1) {
        if (!runDependencyTracking[id]) return id;
        id = orig + Math.random();
      }
    };
  
  var dependenciesPromise = null;
  var resolveRunDependencies = async () => dependenciesPromise;
  var runDependencies = 0;
  
  
  var dependenciesPromiseResolve = null;
  
  var runDependencyTracking = {
  };
  
  var runDependencyWatcher = null;
  var removeRunDependency = (id) => {
      runDependencies--;
  
      Module['monitorRunDependencies']?.(runDependencies);
  
      assert(id, 'removeRunDependency requires an ID');
      assert(runDependencyTracking[id]);
      delete runDependencyTracking[id];
      if (!runDependencies) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        dependenciesPromiseResolve();
      }
    };
  
  
  
  
  var addRunDependency = (id) => {
      if (!runDependencies) {
        dependenciesPromise = new Promise((resolve) => dependenciesPromiseResolve = resolve);
      }
      runDependencies++;
  
      Module['monitorRunDependencies']?.(runDependencies);
  
      assert(id, 'addRunDependency requires an ID')
      assert(!runDependencyTracking[id]);
      runDependencyTracking[id] = 1;
      if (!runDependencyWatcher && globalThis.setInterval) {
        // Check for missing dependencies every few seconds
        runDependencyWatcher = setInterval(() => {
          if (ABORT) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null;
            return;
          }
          var shown = false;
          for (var dep in runDependencyTracking) {
            if (!shown) {
              shown = true;
              err('still waiting on run dependencies:');
            }
            err(`dependency: ${dep}`);
          }
          if (shown) {
            err('(end of list)');
          }
        }, 10_000);
        // Prevent this timer from keeping the runtime alive if nothing
        // else is.
        runDependencyWatcher.unref?.()
      }
    };
  
  
  var preloadPlugins = [];
  var FS_handledByPreloadPlugin = async (byteArray, fullname) => {
      // Ensure plugins are ready.
      if (typeof Browser != 'undefined') Browser.init();
  
      for (var plugin of preloadPlugins) {
        if (plugin['canHandle'](fullname)) {
          assert(plugin['handle'].constructor.name === 'AsyncFunction', 'Filesystem plugin handlers must be async functions (See #24914)')
          return plugin['handle'](byteArray, fullname);
        }
      }
      // If no plugin handled this file then return the original/unmodified
      // byteArray.
      return byteArray;
    };
  var FS_preloadFile = async (parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish) => {
      // TODO we should allow people to just pass in a complete filename instead
      // of parent and name being that we just join them anyways
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency(`cp ${fullname}`); // might have several active requests for the same fullname
      addRunDependency(dep);
  
      try {
        var byteArray = url;
        if (typeof url == 'string') {
          byteArray = await asyncLoad(url);
        }
  
        byteArray = await FS_handledByPreloadPlugin(byteArray, fullname);
        preFinish?.();
        if (!dontCreateFile) {
          FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
        }
      } finally {
        removeRunDependency(dep);
      }
    };
  var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      FS_preloadFile(parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish).then(onload).catch(onerror);
    };
  
  var FS = {
  root:null,
  mounts:[],
  devices:{
  },
  streams:[],
  nextInode:1,
  nameTable:[],
  currentPath:"/",
  initialized:false,
  ignorePermissions:true,
  filesystems:null,
  syncFSRequests:0,
  ErrnoError:class extends Error {
        name = 'ErrnoError';
        // We set the `name` property to be able to identify `FS.ErrnoError`
        // - the `name` is a standard ECMA-262 property of error objects. Kind of good to have it anyway.
        // - when using PROXYFS, an error can come from an underlying FS
        // as different FS objects have their own FS.ErrnoError each,
        // the test `err instanceof FS.ErrnoError` won't detect an error coming from another filesystem, causing bugs.
        // we'll use the reliable test `err.name == "ErrnoError"` instead
        constructor(errno) {
          super(runtimeInitialized ? strError(errno) : '');
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
        }
      },
  FSStream:class {
        shared = {};
        get object() {
          return this.node;
        }
        set object(val) {
          this.node = val;
        }
        get isRead() {
          return (this.flags & 2097155) !== 1;
        }
        get isWrite() {
          return (this.flags & 2097155) !== 0;
        }
        get isAppend() {
          return (this.flags & 1024);
        }
        get flags() {
          return this.shared.flags;
        }
        set flags(val) {
          this.shared.flags = val;
        }
        get position() {
          return this.shared.position;
        }
        set position(val) {
          this.shared.position = val;
        }
      },
  FSNode:class {
        node_ops = {};
        stream_ops = {};
        readMode = 292 | 73;
        writeMode = 146;
        mounted = null;
        constructor(parent, name, mode, rdev) {
          if (!parent) {
            parent = this;  // root node sets parent to itself
          }
          this.parent = parent;
          this.mount = parent.mount;
          this.id = FS.nextInode++;
          this.name = name;
          this.mode = mode;
          this.rdev = rdev;
          this.atime = this.mtime = this.ctime = Date.now();
        }
        get read() {
          return (this.mode & this.readMode) === this.readMode;
        }
        set read(val) {
          val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
        }
        get write() {
          return (this.mode & this.writeMode) === this.writeMode;
        }
        set write(val) {
          val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
        }
        get isFolder() {
          return FS.isDir(this.mode);
        }
        get isDevice() {
          return FS.isChrdev(this.mode);
        }
        // The per-inode readiness wait-queue. The node carries a Set of listener
        // entries {cb}; producers (SOCKFS, PIPEFS) call notifyListeners on a
        // readiness transition, and poll()/epoll consume it. It lives on the node
        // (not the fd) so dup'd fds share one queue. Only nodes that derive real
        // readiness (sockets, pipes, and an epoll's own node) ever use this -
        // always-ready types (regular files, ttys) never register or notify.
        addListener(cb, exclusive = false) {
          var entry = {cb, exclusive};
          var listeners = (this.listeners ??= new Set());
          listeners.add(entry);
          return {listeners, entry};
        }
        notifyListeners(flags) {
          // Iterates the set without copying, which is safe ONLY under a
          // load-bearing contract that every internal listener must honour:
          //   1. A listener must not run user code synchronously (a poll waiter only
          //      resolves a Promise; an epoll registration only re-lists +
          //      re-notifies; the epoll callback only schedules a tick). User code
          //      runs on a later tick, never inside this loop.
          //   2. A listener may delete entries only from ITS OWN waiter, never from
          //      a sibling node's set that may be mid-iteration. (Deleting an entry
          //      of the set being iterated here is fine - a Set tolerates removal of
          //      a not-yet-visited entry mid-iteration; mutating a *different* node's
          //      set is fine because that set is not being iterated.)
          // Violating either gives silently skipped wakeups that are near-impossible
          // to reproduce. Any new producer/listener must preserve it.
          if (!this.listeners) return;
          // Fire every non-exclusive listener. Among EPOLLEXCLUSIVE registrations
          // (one fd watched by several epolls) wake only one, rotating round-robin
          // per node, to avoid a thundering herd. (Only epoll registrations are ever
          // exclusive; poll waiters and a node's own consumers are not.)
          var excl;
          for (var entry of this.listeners) {
            if (entry.exclusive) (excl ||= []).push(entry);
            else entry.cb(flags);
          }
          if (excl) {
            var i = (this.exclTurn || 0) % excl.length;
            this.exclTurn = i + 1;
            excl[i].cb(flags);
          }
        }
      },
  lookupPath(path, opts = {}) {
        if (!path) {
          throw new FS.ErrnoError(44);
        }
        opts.follow_mount ??= true
  
        if (!PATH.isAbs(path)) {
          path = FS.cwd() + '/' + path;
        }
  
        // limit max consecutive symlinks to SYMLOOP_MAX.
        linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
          // split the absolute path
          var parts = path.split('/').filter((p) => !!p);
  
          // start at the root
          var current = FS.root;
          var current_path = '/';
  
          for (var i = 0; i < parts.length; i++) {
            var islast = (i === parts.length-1);
            if (islast && opts.parent) {
              // stop resolving
              break;
            }
  
            if (parts[i] === '.') {
              continue;
            }
  
            if (parts[i] === '..') {
              current_path = PATH.dirname(current_path);
              if (FS.isRoot(current)) {
                path = current_path + '/' + parts.slice(i + 1).join('/');
                // We're making progress here, don't let many consecutive ..'s
                // lead to ELOOP
                nlinks--;
                continue linkloop;
              } else {
                current = current.parent;
              }
              continue;
            }
  
            current_path = PATH.join2(current_path, parts[i]);
            try {
              current = FS.lookupNode(current, parts[i]);
            } catch (e) {
              // if noent_okay is true, suppress a ENOENT in the last component
              // and return an object with an undefined node. This is needed for
              // resolving symlinks in the path when creating a file.
              if ((e?.errno === 44) && islast && opts.noent_okay) {
                return { path: current_path };
              }
              throw e;
            }
  
            // jump to the mount's root node if this is a mountpoint
            if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
              current = current.mounted.root;
            }
  
            // by default, lookupPath will not follow a symlink if it is the final path component.
            // setting opts.follow = true will override this behavior.
            if (FS.isLink(current.mode) && (!islast || opts.follow)) {
              if (!current.node_ops.readlink) {
                throw new FS.ErrnoError(52);
              }
              var link = current.node_ops.readlink(current);
              if (!PATH.isAbs(link)) {
                link = PATH.dirname(current_path) + '/' + link;
              }
              path = link + '/' + parts.slice(i + 1).join('/');
              continue linkloop;
            }
          }
          return { path: current_path, node: current };
        }
        throw new FS.ErrnoError(32);
      },
  getPath(node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? `${mount}/${path}` : mount + path;
          }
          path = path ? `${node.name}/${path}` : node.name;
          node = node.parent;
        }
      },
  hashName(parentid, name) {
        var hash = 0;
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },
  hashAddNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },
  hashRemoveNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },
  lookupNode(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },
  createNode(parent, name, mode, rdev = undefined) {
        assert(typeof parent == 'object')
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },
  destroyNode(node) {
        FS.hashRemoveNode(node);
      },
  isRoot(node) {
        return node === node.parent;
      },
  isMountpoint(node) {
        return !!node.mounted;
      },
  isFile(mode) {
        return (mode & 61440) === 32768;
      },
  isDir(mode) {
        return (mode & 61440) === 16384;
      },
  isLink(mode) {
        return (mode & 61440) === 40960;
      },
  isChrdev(mode) {
        return (mode & 61440) === 8192;
      },
  isBlkdev(mode) {
        return (mode & 61440) === 24576;
      },
  isFIFO(mode) {
        return (mode & 61440) === 4096;
      },
  isSocket(mode) {
        return (mode & 49152) === 49152;
      },
  flagsToPermissionString(flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },
  nodePermissions(node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.includes('r') && !(node.mode & 292)) {
          return 2;
        }
        if (perms.includes('w') && !(node.mode & 146)) {
          return 2;
        }
        if (perms.includes('x') && !(node.mode & 73)) {
          return 2;
        }
        return 0;
      },
  mayLookup(dir) {
        if (!FS.isDir(dir.mode)) return 54;
        var errCode = FS.nodePermissions(dir, 'x');
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0;
      },
  mayCreate(dir, name) {
        if (!FS.isDir(dir.mode)) {
          return 54;
        }
        try {
          var node = FS.lookupNode(dir, name);
          return 20;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },
  mayDelete(dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var errCode = FS.nodePermissions(dir, 'wx');
        if (errCode) {
          return errCode;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return 54;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return 10;
          }
        } else if (FS.isDir(node.mode)) {
          return 31;
        }
        return 0;
      },
  mayOpen(node, flags) {
        if (!node) {
          return 44;
        }
        if (FS.isLink(node.mode)) {
          return 32;
        }
        var mode = FS.flagsToPermissionString(flags);
        if (FS.isDir(node.mode)) {
          // opening for write
          // TODO: check for O_SEARCH? (== search for dir only)
          if (mode !== 'r' || (flags & (512 | 64))) {
            return 31;
          }
        }
        return FS.nodePermissions(node, mode);
      },
  checkOpExists(op, err) {
        if (!op) {
          throw new FS.ErrnoError(err);
        }
        return op;
      },
  MAX_OPEN_FDS:4096,
  nextfd() {
        for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(33);
      },
  getStreamChecked(fd) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        return stream;
      },
  getStream:(fd) => FS.streams[fd],
  createStream(stream, fd = -1) {
        assert(fd >= -1);
  
        // clone it, so we can return an instance of FSStream
        stream = Object.assign(new FS.FSStream(), stream);
        if (fd == -1) {
          fd = FS.nextfd();
        }
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },
  closeStream(fd) {
        FS.streams[fd] = null;
      },
  dupStream(origStream, fd = -1) {
        var stream = FS.createStream(origStream, fd);
        stream.stream_ops?.dup?.(stream);
        return stream;
      },
  doSetAttr(stream, node, attr) {
        var setattr = stream?.stream_ops.setattr;
        var arg = setattr ? stream : node;
        setattr ??= node.node_ops.setattr;
        FS.checkOpExists(setattr, 63)
        try {
          setattr(arg, attr);
        } catch (e) {
          if (e instanceof RangeError) {
            throw new FS.ErrnoError(22);
          }
          throw e;
        }
      },
  chrdev_stream_ops:{
  open(stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          stream.stream_ops.open?.(stream);
        },
  llseek() {
          throw new FS.ErrnoError(70);
        },
  },
  major:(dev) => ((dev) >> 8),
  minor:(dev) => ((dev) & 0xff),
  makedev:(ma, mi) => ((ma) << 8 | (mi)),
  registerDevice(dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },
  getDevice:(dev) => FS.devices[dev],
  getMounts(mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push(...m.mounts);
        }
  
        return mounts;
      },
  syncfs(populate, callback) {
        if (typeof populate == 'function') {
          callback = populate;
          populate = false;
        }
  
        FS.syncFSRequests++;
  
        if (FS.syncFSRequests > 1) {
          err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function doCallback(errCode) {
          assert(FS.syncFSRequests > 0);
          FS.syncFSRequests--;
          return callback(errCode);
        }
  
        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(errCode);
            }
            return;
          }
          if (++completed >= mounts.length) {
            doCallback(null);
          }
        };
  
        // sync all mounts
        for (var mount of mounts) {
          if (mount.type.syncfs) {
            mount.type.syncfs(mount, populate, done);
          } else {
            done(null);
          }
        }
      },
  mount(type, opts, mountpoint) {
        if (typeof type == 'string') {
          // The filesystem was not included, and instead we have an error
          // message stored in the variable.
          throw type;
        }
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(10);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54);
          }
        }
  
        var mount = {
          type,
          opts,
          mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },
  unmount(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(28);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        for (var [hash, current] of Object.entries(FS.nameTable)) {
          while (current) {
            var next = current.name_next;
  
            if (mounts.includes(current.mount)) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        }
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },
  lookup(parent, name) {
        return parent.node_ops.lookup(parent, name);
      },
  mknod(path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name) {
          throw new FS.ErrnoError(28);
        }
        if (name === '.' || name === '..') {
          throw new FS.ErrnoError(20);
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },
  statfs(path) {
        return FS.statfsNode(FS.lookupPath(path, {follow: true}).node);
      },
  statfsStream(stream) {
        // We keep a separate statfsStream function because noderawfs overrides
        // it. In noderawfs, stream.node is sometimes null. Instead, we need to
        // look at stream.path.
        return FS.statfsNode(stream.node);
      },
  statfsNode(node) {
        // NOTE: None of the defaults here are true. We're just returning safe and
        //       sane values. Currently nodefs and rawfs replace these defaults,
        //       other file systems leave them alone.
        var rtn = {
          bsize: 4096,
          frsize: 4096,
          blocks: 1_000_000,
          bfree: 500_000,
          bavail: 500_000,
          files: FS.nextInode,
          ffree: FS.nextInode - 1,
          fsid: 42,
          flags: 2,
          namelen: 255,
        };
  
        if (node.node_ops.statfs) {
          Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
        }
        return rtn;
      },
  create(path, mode = 0o666) {
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },
  mkdir(path, mode = 0o777) {
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },
  mkdirTree(path, mode = 0o777) {
        var dirs = path.split('/');
        var d = '';
        for (var dir of dirs) {
          if (!dir) continue;
          if (d || PATH.isAbs(path)) d += '/';
          d += dir;
          try {
            FS.mkdir(d, mode);
          } catch(e) {
            if (e.errno != 20) throw e;
          }
        }
      },
  mkdev(path, mode, dev = undefined) {
        if (typeof dev == 'undefined') {
          dev = mode;
          mode = 0o666;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },
  symlink(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
          throw new FS.ErrnoError(44);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },
  link(oldpath, newpath, flags) {
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        // Hardlinks are only supported by filesystem backends that provide a
        // `link` node op (e.g. NODERAWFS backed by the host). NODEFS omits it:
        // a host hardlink cannot be confined to the mount root.
        if (!parent.node_ops.link) {
          throw new FS.ErrnoError(34);
        }
        return parent.node_ops.link(parent, newname, oldpath, flags);
      },
  rename(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
  
        // let the errors from non existent directories percolate up
        lookup = FS.lookupPath(old_path, { parent: true });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, { parent: true });
        new_dir = lookup.node;
  
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(75);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(28);
        }
        // new path should not be an ancestor of the old path
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(55);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        errCode = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(10);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, 'w');
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
          // The replaced node is stale now. Evict it only after the rename
          // succeeded: backends like NODEFS report node.id as st_ino.
          if (new_node) {
            FS.hashRemoveNode(new_node);
          }
          // update old node (we do this here to avoid each backend
          // needing to)
          old_node.parent = new_dir;
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },
  rmdir(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },
  readdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        var readdir = FS.checkOpExists(node.node_ops.readdir, 54);
        return readdir(node);
      },
  unlink(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
          // According to POSIX, we should map EISDIR to EPERM, but
          // we instead do what Linux does (and we must, as we use
          // the musl linux libc).
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },
  readlink(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(44);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(28);
        }
        return link.node_ops.readlink(link);
      },
  stat(path, dontFollow = false) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        var getattr = FS.checkOpExists(node.node_ops.getattr, 63);
        return getattr(node);
      },
  fstat(fd) {
        var stream = FS.getStreamChecked(fd);
        var node = stream.node;
        var getattr = stream.stream_ops.getattr;
        var arg = getattr ? stream : node;
        getattr ??= node.node_ops.getattr;
        FS.checkOpExists(getattr, 63)
        return getattr(arg);
      },
  lstat(path) {
        return FS.stat(path, true);
      },
  doChmod(stream, node, mode, dontFollow = false) {
        FS.doSetAttr(stream, node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          ctime: Date.now(),
          dontFollow
        });
      },
  chmod(path, mode, dontFollow = false) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChmod(null, node, mode, dontFollow);
      },
  lchmod(path, mode) {
        FS.chmod(path, mode, true);
      },
  fchmod(fd, mode) {
        var stream = FS.getStreamChecked(fd);
        FS.doChmod(stream, stream.node, mode, false);
      },
  doChown(stream, node, dontFollow = false) {
        FS.doSetAttr(stream, node, {
          timestamp: Date.now(),
          dontFollow
          // we ignore the uid / gid for now
        });
      },
  chown(path, uid, gid, dontFollow = false) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChown(null, node, dontFollow);
      },
  lchown(path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },
  fchown(fd, uid, gid) {
        var stream = FS.getStreamChecked(fd);
        FS.doChown(stream, stream.node, false);
      },
  doTruncate(stream, node, len) {
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.nodePermissions(node, 'w');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.doSetAttr(stream, node, {
          size: len,
          timestamp: Date.now()
        });
      },
  truncate(path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(28);
        }
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doTruncate(null, node, len);
      },
  ftruncate(fd, len) {
        var stream = FS.getStreamChecked(fd);
        if (len < 0 || (stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(28);
        }
        FS.doTruncate(stream, stream.node, len);
      },
  utime(path, atime, mtime, dontFollow = false) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        FS.doSetAttr(null, lookup.node, {
          atime: atime,
          mtime: mtime,
          dontFollow
        });
      },
  open(path, flags, mode = 0o666) {
        if (path === '') {
          throw new FS.ErrnoError(44);
        }
        flags = FS_modeStringToFlags(flags);
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        var isDirPath;
        if (typeof path == 'object') {
          node = path;
        } else {
          isDirPath = path.endsWith('/');
          // noent_okay makes it so that if the final component of the path
          // doesn't exist, lookupPath returns `node: undefined`. `path` will be
          // updated to point to the target of all symlinks.
          var lookup = FS.lookupPath(path, {
            follow: !(flags & 131072),
            noent_okay: true
          });
          node = lookup.node;
          path = lookup.path;
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(20);
            }
          } else if (isDirPath) {
            throw new FS.ErrnoError(31);
          } else {
            // node doesn't exist, try to create it
            // Ignore the permission bits here to ensure we can `open` this new
            // file below. We use chmod below to apply the permissions once the
            // file is open.
            node = FS.mknod(path, mode | 0o777, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var errCode = FS.mayOpen(node, flags);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // do truncation if necessary
        if ((flags & 512) && !created) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512 | 131072);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        });
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (created) {
          FS.chmod(node, mode & 0o777);
        }
        return stream;
      },
  close(stream) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (stream.getdents) stream.getdents = null; // free readdir state
        // The fd is going away: wake anything waiting on it (poll/epoll) with
        // POLLNVAL so a blocking wait unblocks and an epoll registration is evicted
        // on its next derive. Only sockets/pipes/epoll ever carry a wait-queue, so
        // for every other stream (incl. nodeless noderawfs stdio) this is a no-op.
        stream.node?.notifyListeners(32);
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },
  isClosed(stream) {
        return stream.fd === null;
      },
  llseek(stream, offset, whence) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(70);
        }
        if (whence != 0 && whence != 1 && whence != 2) {
          throw new FS.ErrnoError(28);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },
  read(stream, buffer, offset, length, position = undefined) {
        assert(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(28);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },
  write(stream, buffer, offset, length, position = undefined, canOwn = undefined) {
        assert(offset >= 0);
        assert(buffer.subarray, 'FS.write expects a TypedArray');
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(28);
        }
        if (stream.seekable && stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },
  mmap(stream, length, position, prot, flags) {
        // User requests writing to file (prot & PROT_WRITE != 0).
        // Checking if we have permissions to write to the file unless
        // MAP_PRIVATE flag is set. According to POSIX spec it is possible
        // to write to file opened in read-only mode with MAP_PRIVATE flag,
        // as all modifications will be visible only in the memory of
        // the current process.
        if ((prot & 2)
            && !(flags & 2)
            && (stream.flags & 2097155) !== 2) {
          throw new FS.ErrnoError(2);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(2);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(43);
        }
        if (!length) {
          throw new FS.ErrnoError(28);
        }
        return stream.stream_ops.mmap(stream, length, position, prot, flags);
      },
  msync(stream, buffer, offset, length, mmapFlags) {
        assert(offset >= 0);
        if (!stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },
  ioctl(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(59);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },
  readFile(path, opts = {}) {
        opts.flags ??= 0;
        opts.encoding ??= 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          abort(`Invalid encoding type "${opts.encoding}"`);
        }
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          buf = UTF8ArrayToString(buf);
        }
        FS.close(stream);
        return buf;
      },
  writeFile(path, data, opts = {}) {
        opts.flags ??= 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        data = FS_fileDataToTypedArray(data);
        FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
        FS.close(stream);
      },
  cwd:() => FS.currentPath,
  chdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) {
          throw new FS.ErrnoError(44);
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(54);
        }
        var errCode = FS.nodePermissions(lookup.node, 'x');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.currentPath = lookup.path;
      },
  createDefaultDirectories() {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },
  createDefaultDevices() {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: () => 0,
          write: (stream, buffer, offset, length, pos) => length,
          llseek: () => 0,
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using err() rather than out()
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        // use a buffer to avoid overhead of individual crypto calls per byte
        var randomBuffer = new Uint8Array(1024), randomLeft = 0;
        var randomByte = () => {
          if (!randomLeft) {
            randomFill(randomBuffer);
            randomLeft = randomBuffer.byteLength;
          }
          return randomBuffer[--randomLeft];
        };
        FS.createDevice('/dev', 'random', randomByte);
        FS.createDevice('/dev', 'urandom', randomByte);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },
  createSpecialDirectories() {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the
        // name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        var proc_self = FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount() {
            var node = FS.createNode(proc_self, 'fd', 16895, 73);
            node.stream_ops = {
              llseek: MEMFS.stream_ops.llseek,
            };
            node.node_ops = {
              lookup(parent, name) {
                var fd = +name;
                var stream = FS.getStreamChecked(fd);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: () => stream.path },
                  id: fd + 1,
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              },
              readdir() {
                return Array.from(FS.streams.entries())
                  .filter(([k, v]) => v)
                  .map(([k, v]) => k.toString());
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },
  createStandardStreams(input, output, error) {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (input) {
          FS.createDevice('/dev', 'stdin', input);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (output) {
          FS.createDevice('/dev', 'stdout', null, output);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (error) {
          FS.createDevice('/dev', 'stderr', null, error);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 0);
        var stdout = FS.open('/dev/stdout', 1);
        var stderr = FS.open('/dev/stderr', 1);
        assert(stdin.fd === 0, `invalid handle for stdin (${stdin.fd})`);
        assert(stdout.fd === 1, `invalid handle for stdout (${stdout.fd})`);
        assert(stderr.fd === 2, `invalid handle for stderr (${stderr.fd})`);
      },
  staticInit() {
        FS.nameTable.length = 4096;
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
        };
      },
  init(input = undefined, output = undefined, error = undefined) {
        assert(!FS.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.initialized = true;
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        input ??= Module['stdin'];
        output ??= Module['stdout'];
        error ??= Module['stderr'];
  
        FS.createStandardStreams(input, output, error);
      },
  quit() {
        FS.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        _fflush(0);
        // close all of our streams
        for (var stream of FS.streams) {
          if (stream) {
            FS.close(stream);
          }
        }
      },
  analyzePath(path, dontResolveLastLink = false) {
        warnOnce('FS.analyzePath is deprecated; use FS.lookupPath or FS.stat instead');
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },
  createPath(parent, path, canRead = undefined, canWrite = undefined) {
        parent = typeof parent == 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            if (e.errno != 20) throw e;
          }
          parent = current;
        }
        return current;
      },
  createFile(parent, name, properties, canRead = undefined, canWrite = undefined) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(canRead, canWrite);
        return FS.create(path, mode);
      },
  createDataFile(parent, name, data = undefined, canRead = undefined, canWrite = undefined, canOwn = undefined) {
        var path = name;
        if (parent) {
          parent = typeof parent == 'string' ? parent : FS.getPath(parent);
          path = name ? PATH.join2(parent, name) : parent;
        }
        var mode = FS_getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          data = FS_fileDataToTypedArray(data);
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 577);
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
      },
  createDevice(parent, name, input = undefined, output = undefined) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(!!input, !!output);
        FS.createDevice.major ??= 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open(stream) {
            stream.seekable = false;
          },
          close(stream) {
            // flush any pending line data
            if (output?.buffer?.length) {
              output(10);
            }
          },
          read(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === undefined && !bytesRead) {
                throw new FS.ErrnoError(6);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.atime = Date.now();
            }
            return bytesRead;
          },
          write(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
            }
            if (length) {
              stream.node.mtime = stream.node.ctime = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },
  forceLoadFile(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (globalThis.XMLHttpRequest) {
          abort('Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.');
        } else { // Command-line.
          try {
            obj.contents = readBinary(obj.url);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
      },
  createLazyFile(parent, name, url, canRead = undefined, canWrite = undefined) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array).
        // Actual getting is abstracted away for eventual reuse.
        class LazyUint8Array {
          lengthKnown = false;
          chunks = []; // Loaded chunks. Index is the chunk number
          get(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = (idx / this.chunkSize)|0;
            return this.getter(chunkNum)[chunkOffset];
          }
          setDataGetter(getter) {
            this.getter = getter;
          }
          cacheLength() {
            // Find length
            var xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort(`Couldn't load ${url}. Status: ${xhr.status}`);
            var datalength = Number(xhr.getResponseHeader('Content-length'));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader('Accept-Ranges')) && header === 'bytes';
            var usesGzip = (header = xhr.getResponseHeader('Content-Encoding')) && header === 'gzip';
  
            var chunkSize = 1024*1024; // Chunk size in bytes
  
            if (!hasByteServing) chunkSize = datalength;
  
            // Function to get a range from the remote URL.
            var doXHR = (from, to) => {
              if (from > to) abort(`invalid range (${from}, ${to}) or no bytes requested!`);
              if (to > datalength-1) abort(`only ${datalength} bytes available! programmer error!`);
  
              // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
              var xhr = new XMLHttpRequest();
              xhr.open('GET', url, false);
              if (datalength !== chunkSize) xhr.setRequestHeader('Range', `bytes=${from}-${to}`);
  
              // Some hints to the browser that we want binary data.
              xhr.responseType = 'arraybuffer';
              if (xhr.overrideMimeType) {
                xhr.overrideMimeType('text/plain; charset=x-user-defined');
              }
  
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort(`Couldn't load ${url}. Status: ${xhr.status}`);
              if (xhr.response !== undefined) {
                return new Uint8Array(/** @type{Array<number>} */(xhr.response || []));
              }
              return intArrayFromString(xhr.responseText ?? '', true);
            };
            var lazyArray = this;
            lazyArray.setDataGetter((chunkNum) => {
              var start = chunkNum * chunkSize;
              var end = (chunkNum+1) * chunkSize - 1; // including this byte
              end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') {
                lazyArray.chunks[chunkNum] = doXHR(start, end);
              }
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') abort('doXHR failed!');
              return lazyArray.chunks[chunkNum];
            });
  
            if (usesGzip || !datalength) {
              // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
              chunkSize = datalength = 1; // this will force getter(0)/doXHR do download the whole file
              datalength = this.getter(0).length;
              chunkSize = datalength;
              out('LazyFiles on gzip forces download of the whole file when length is accessed');
            }
  
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true;
          }
          get length() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._length;
          }
          get chunkSize() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._chunkSize;
          }
        }
  
        if (globalThis.XMLHttpRequest) {
          if (!ENVIRONMENT_IS_WORKER) abort('Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc');
          var lazyArray = new LazyUint8Array();
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperties(node, {
          usedBytes: {
            get: function() { return this.contents.length; }
          }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        for (const [key, fn] of Object.entries(node.stream_ops)) {
          stream_ops[key] = (...args) => {
            FS.forceLoadFile(node);
            return fn(...args);
          };
        }
        function writeChunks(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        }
        // use a custom read function
        stream_ops.read = (stream, buffer, offset, length, position) => {
          FS.forceLoadFile(node);
          return writeChunks(stream, buffer, offset, length, position)
        };
        // use a custom mmap function
        stream_ops.mmap = (stream, length, position, prot, flags) => {
          FS.forceLoadFile(node);
          var ptr = mmapAlloc(length);
          if (!ptr) {
            throw new FS.ErrnoError(48);
          }
          writeChunks(stream, HEAP8, ptr, length, position);
          return { ptr, allocated: true };
        };
        node.stream_ops = stream_ops;
        return node;
      },
  };
  
  
  
  
  
  /** not-@type {!BigInt64Array} */
  var HEAP64;
  var SYSCALLS = {
  currentUmask:18,
  calculateAt(dirfd, path, allowEmpty = false) {
        if (PATH.isAbs(path)) {
          return path;
        }
        // relative path
        var dir;
        if (dirfd === -100) {
          dir = FS.cwd();
        } else {
          var dirstream = SYSCALLS.getStreamFromFD(dirfd);
          dir = dirstream.path;
        }
        if (path.length == 0) {
          if (!allowEmpty) {
            throw new FS.ErrnoError(44);;
          }
          return dir;
        }
        return dir + '/' + path;
      },
  writeStat(buf, stat) {
        HEAPU32[((buf)>>2)] = stat.dev;
        HEAPU32[(((buf)+(4))>>2)] = stat.mode;
        HEAPU32[(((buf)+(8))>>2)] = stat.nlink;
        HEAPU32[(((buf)+(12))>>2)] = stat.uid;
        HEAPU32[(((buf)+(16))>>2)] = stat.gid;
        HEAPU32[(((buf)+(20))>>2)] = stat.rdev;
        HEAP64[(((buf)+(24))>>3)] = BigInt(stat.size);
        HEAP32[(((buf)+(32))>>2)] = 4096;
        HEAP32[(((buf)+(36))>>2)] = stat.blocks;
        // Prefer `*Ms` properties if available (e.g. from MEMFS, or NODEFS / host
        // `fs.Stats`) for sub-millisecond precision; fall back to Date#getTime for
        // other filesystems.
        var atime = stat.atimeMs ?? stat.atime.getTime();
        var mtime = stat.mtimeMs ?? stat.mtime.getTime();
        var ctime = stat.ctimeMs ?? stat.ctime.getTime();
        HEAP64[(((buf)+(40))>>3)] = BigInt(Math.floor(atime / 1000));
        HEAPU32[(((buf)+(48))>>2)] = Math.floor((atime % 1000) * 1_000_000);
        HEAP64[(((buf)+(56))>>3)] = BigInt(Math.floor(mtime / 1000));
        HEAPU32[(((buf)+(64))>>2)] = Math.floor((mtime % 1000) * 1_000_000);
        HEAP64[(((buf)+(72))>>3)] = BigInt(Math.floor(ctime / 1000));
        HEAPU32[(((buf)+(80))>>2)] = Math.floor((ctime % 1000) * 1_000_000);
        HEAP64[(((buf)+(88))>>3)] = BigInt(stat.ino);
        return 0;
      },
  writeStatFs(buf, stats) {
        HEAPU32[(((buf)+(4))>>2)] = stats.bsize;
        HEAPU32[(((buf)+(60))>>2)] = stats.bsize;
        HEAP64[(((buf)+(8))>>3)] = BigInt(stats.blocks);
        HEAP64[(((buf)+(16))>>3)] = BigInt(stats.bfree);
        HEAP64[(((buf)+(24))>>3)] = BigInt(stats.bavail);
        HEAP64[(((buf)+(32))>>3)] = BigInt(stats.files);
        HEAP64[(((buf)+(40))>>3)] = BigInt(stats.ffree);
        HEAPU32[(((buf)+(48))>>2)] = stats.fsid;
        HEAPU32[(((buf)+(64))>>2)] = stats.flags;  // ST_NOSUID
        HEAPU32[(((buf)+(56))>>2)] = stats.namelen;
      },
  doMsync(addr, stream, len, flags, offset) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (flags & 2) {
          // MAP_PRIVATE calls need not to be synced back to underlying fs
          return 0;
        }
        var buffer = HEAPU8.subarray(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags);
      },
  getStreamFromFD(fd) {
        var stream = FS.getStreamChecked(fd);
        return stream;
      },
  varargs:undefined,
  getStr(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      },
  };
  
  /** @type {!Int16Array} */
  var HEAP16;
  function ___syscall_fcntl64(fd, cmd, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (cmd) {
        case 0: {
          var arg = syscallGetVarargI();
          if (arg < 0) {
            return -28;
          }
          while (FS.streams[arg]) {
            arg++;
          }
          var newStream;
          newStream = FS.dupStream(stream, arg);
          return newStream.fd;
        }
        case 1:
        case 2:
          return 0;  // FD_CLOEXEC makes no sense for a single process.
        case 3:
          return stream.flags;
        case 4: {
          var arg = syscallGetVarargI();
          var mask = 289792;
          stream.flags = (stream.flags & ~mask) | (arg & mask);
          return 0;
        }
        case 12: {
          var arg = syscallGetVarargP();
          var offset = 0;
          // We're always unlocked.
          HEAP16[(((arg)+(offset))>>1)] = 2;
          return 0;
        }
        case 13:
        case 14:
          // Pretend that the locking is successful. These are process-level locks,
          // and Emscripten programs are a single process. If we supported linking a
          // filesystem between programs, we'd need to do more here.
          // See https://github.com/emscripten-core/emscripten/issues/23697
          return 0;
      }
      return -28;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  
  
  
  
  function ___syscall_ioctl(fd, op, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (op) {
        case 21509: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21505: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcgets) {
            var termios = stream.tty.ops.ioctl_tcgets(stream);
            var argp = syscallGetVarargP();
            HEAP32[((argp)>>2)] = termios.c_iflag || 0;
            HEAP32[(((argp)+(4))>>2)] = termios.c_oflag || 0;
            HEAP32[(((argp)+(8))>>2)] = termios.c_cflag || 0;
            HEAP32[(((argp)+(12))>>2)] = termios.c_lflag || 0;
            for (var i = 0; i < 32; i++) {
              HEAP8[(argp + i)+(17)] = termios.c_cc[i] || 0;
            }
            return 0;
          }
          return 0;
        }
        case 21510:
        case 21511:
        case 21512: {
          if (!stream.tty) return -59;
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21506:
        case 21507:
        case 21508: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcsets) {
            var argp = syscallGetVarargP();
            var c_iflag = HEAP32[((argp)>>2)];
            var c_oflag = HEAP32[(((argp)+(4))>>2)];
            var c_cflag = HEAP32[(((argp)+(8))>>2)];
            var c_lflag = HEAP32[(((argp)+(12))>>2)];
            var c_cc = []
            for (var i = 0; i < 32; i++) {
              c_cc.push(HEAP8[(argp + i)+(17)]);
            }
            return stream.tty.ops.ioctl_tcsets(stream.tty, op, { c_iflag, c_oflag, c_cflag, c_lflag, c_cc });
          }
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21519: {
          if (!stream.tty) return -59;
          var argp = syscallGetVarargP();
          HEAP32[((argp)>>2)] = 0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -59;
          return -28; // not supported
        }
        case 21537:
        case 21531: {
          var argp = syscallGetVarargP();
          return FS.ioctl(stream, op, argp);
        }
        case 21523: {
          // TODO: in theory we should write to the winsize struct that gets
          // passed in, but for now musl doesn't read anything on it
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tiocgwinsz) {
            var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
            var argp = syscallGetVarargP();
            HEAP16[((argp)>>1)] = winsize[0];
            HEAP16[(((argp)+(2))>>1)] = winsize[1];
          }
          return 0;
        }
        case 21524: {
          // TODO: technically, this ioctl call should change the window size.
          // but, since emscripten doesn't have any concept of a terminal window
          // yet, we'll just silently throw it away as we do TIOCGWINSZ
          if (!stream.tty) return -59;
          return 0;
        }
        case 21515: {
          if (!stream.tty) return -59;
          return 0;
        }
        default: return -28; // not supported
      }
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  
  function ___syscall_openat(dirfd, path, flags, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      var mode = varargs ? syscallGetVarargI() : 0;
      if (flags & 64) {
        mode &= ~SYSCALLS.currentUmask;
      }
      return FS.open(path, flags, mode).fd;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  var __abort_js = () =>
      abort('native code called abort()');

  
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
      assert(typeof maxBytesToWrite == 'number', 'stringToUTF8 requires a third parameter that specifies the length of the output buffer');
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    };
  
  
  
  var __tzset_js = (timezone, daylight, std_name, dst_name) => {
      // TODO: Use (malleable) environment variables instead of system settings.
      var currentYear = new Date().getFullYear();
      var winter = new Date(currentYear, 0, 1);
      var summer = new Date(currentYear, 6, 1);
      var winterOffset = winter.getTimezoneOffset();
      var summerOffset = summer.getTimezoneOffset();
  
      // Local standard timezone offset. Local standard time is not adjusted for
      // daylight savings.  This code uses the fact that getTimezoneOffset returns
      // a greater value during Standard Time versus Daylight Saving Time (DST).
      // Thus it determines the expected output during Standard Time, and it
      // compares whether the output of the given date the same (Standard) or less
      // (DST).
      var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
  
      // timezone is specified as seconds west of UTC ("The external variable
      // `timezone` shall be set to the difference, in seconds, between
      // Coordinated Universal Time (UTC) and local standard time."), the same
      // as returned by stdTimezoneOffset.
      // See http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html
      HEAPU32[((timezone)>>2)] = stdTimezoneOffset * 60;
  
      HEAP32[((daylight)>>2)] = Number(winterOffset != summerOffset);
  
      var extractZone = (timezoneOffset) => {
        // Why inverse sign?
        // Read here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
        var sign = timezoneOffset >= 0 ? '-' : '+';
  
        var absOffset = Math.abs(timezoneOffset)
        var hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
        var minutes = String(absOffset % 60).padStart(2, '0');
  
        return `UTC${sign}${hours}${minutes}`;
      }
  
      var winterName = extractZone(winterOffset);
      var summerName = extractZone(summerOffset);
      assert(winterName);
      assert(summerName);
      assert(lengthBytesUTF8(winterName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${winterName})`);
      assert(lengthBytesUTF8(summerName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${summerName})`);
      if (summerOffset < winterOffset) {
        // Northern hemisphere
        stringToUTF8(winterName, std_name, 17);
        stringToUTF8(summerName, dst_name, 17);
      } else {
        stringToUTF8(winterName, dst_name, 17);
        stringToUTF8(summerName, std_name, 17);
      }
    };

  
  var runtimeKeepaliveCounter = 0;
  var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
  var _proc_exit = (code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        Module['onExit']?.(code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    };
  
  
  /** @param {boolean|number=} implicit */
  var exitJS = (status, implicit) => {
      EXITSTATUS = status;
  
      checkUnflushedContent();
  
      // if exit() was called explicitly, warn the user if the runtime isn't actually being shut down
      if (keepRuntimeAlive() && !implicit) {
        var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
        err(msg);
      }
  
      _proc_exit(status);
    };
  var _exit = exitJS;
  
  var __emscripten_runtime_keepalive_clear = () => {
      noExitRuntime = false;
      runtimeKeepaliveCounter = 0;
    };
  
  var _emscripten_force_exit = (status) => {
      warnOnce('emscripten_force_exit cannot actually shut down the runtime, as the build does not have EXIT_RUNTIME set');
      __emscripten_runtime_keepalive_clear();
      _exit(status);
    };

  var _emscripten_get_now = () => performance.now();

  var getHeapMax = () =>
      // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
      // full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
      // for any code that deals with heap sizes, which would require special
      // casing all heap size related code to treat 0 specially.
      2147483648;
  
  var alignMemory = (size, alignment) => {
      assert(alignment, 'alignment argument is required');
      return Math.ceil(size / alignment) * alignment;
    };
  
  var growMemory = (size) => {
      var oldHeapSize = wasmMemory.buffer.byteLength;
      var pages = ((size - oldHeapSize + 65535) / 65536) | 0;
      try {
        // round size grow request up to wasm page size (fixed 64KB per spec)
        wasmMemory.grow(pages); // .grow() takes a delta compared to the previous size
        updateMemoryViews();
        return 1 /*success*/;
      } catch(e) {
        err(`growMemory: Attempted to grow heap from ${oldHeapSize} bytes to ${size} bytes, but got error: ${e}`);
      }
      // implicit 0 return to save code size (caller will cast 'undefined' into 0
      // anyhow)
    };
  
  var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      requestedSize >>>= 0;
      // With multithreaded builds, races can happen (another thread might increase the size
      // in between), so return a failure, and let the caller retry.
      assert(requestedSize > oldSize);
  
      // Memory resize rules:
      // 1.  Always increase heap size to at least the requested size, rounded up
      //     to next page multiple.
      // 2a. If MEMORY_GROWTH_LINEAR_STEP == -1, excessively resize the heap
      //     geometrically: increase the heap size according to
      //     MEMORY_GROWTH_GEOMETRIC_STEP factor (default +20%), At most
      //     overreserve by MEMORY_GROWTH_GEOMETRIC_CAP bytes (default 96MB).
      // 2b. If MEMORY_GROWTH_LINEAR_STEP != -1, excessively resize the heap
      //     linearly: increase the heap size by at least
      //     MEMORY_GROWTH_LINEAR_STEP bytes.
      // 3.  Max size for the heap is capped at 2048MB-WASM_PAGE_SIZE, or by
      //     MAXIMUM_MEMORY, or by ASAN limit, depending on which is smallest
      // 4.  If we were unable to allocate as much memory, it may be due to
      //     over-eager decision to excessively reserve due to (3) above.
      //     Hence if an allocation fails, cut down on the amount of excess
      //     growth, in an attempt to succeed to perform a smaller allocation.
  
      // A limit is set for how much we can grow. We should not exceed that
      // (the wasm binary specifies it, so if we tried, we'd fail anyhow).
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        err(`Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is ${maxHeapSize} bytes!`);
        return false;
      }
  
      // Loop through potential heap size increases. If we attempt a too eager
      // reservation that fails, cut down on the attempted size and reserve a
      // smaller bump instead. (max 3 times, chosen somewhat arbitrarily)
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown); // ensure geometric growth
        // but limit overreserving (default to capping at +96MB overgrowth at most)
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296 );
  
        var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
  
        var replacement = growMemory(newSize);
        if (replacement) {
  
          return true;
        }
      }
      err(`Failed to grow the heap from ${oldSize} bytes to ${newSize} bytes, not enough memory!`);
      return false;
    };

  
  var handleException = (e) => {
      // Certain exception types we do not treat as errors since they are used for
      // internal control flow.
      // 1. ExitStatus, which is thrown by exit()
      // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
      //    that wish to return to JS event loop.
      if (e instanceof ExitStatus || e == 'unwind') {
        return EXITSTATUS;
      }
      checkStackCookie();
      if (e instanceof WebAssembly.RuntimeError) {
        if (_emscripten_stack_get_current() <= 0) {
          err('Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 65536)');
        }
      }
      quit_(1, e);
    };
  
  
  
  var maybeExit = () => {
      if (!keepRuntimeAlive()) {
        try {
          _exit(EXITSTATUS);
        } catch (e) {
          handleException(e);
        }
      }
    };
  var callUserCallback = (func, ...args) => {
      if (ABORT) {
        err('user callback triggered after runtime exited or application aborted.  Ignoring.');
        return;
      }
      try {
        return func(...args);
      } catch (e) {
        handleException(e);
      } finally {
        maybeExit();
      }
    };
  
  var _emscripten_set_main_loop_timing = (mode, value) => {
      MainLoop.timingMode = mode;
      MainLoop.timingValue = value;
  
      if (!MainLoop.func) {
        err('emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.');
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0) {
        MainLoop.scheduler = function MainLoop_scheduler_setTimeout() {
          var timeUntilNextTick = Math.max(0, MainLoop.tickStartTime + value - _emscripten_get_now())|0;
          setTimeout(MainLoop.runner, timeUntilNextTick); // doing this each time means that on exception, we stop
        };
      } else if (mode == 1) {
        MainLoop.scheduler = function MainLoop_scheduler_rAF() {
          MainLoop.requestAnimationFrame(MainLoop.runner);
        };
      } else {
        assert(mode == 2);
        if (!MainLoop.setImmediate) {
          if (globalThis.scheduler) {
            // Some modern browsers implement scheduler.postTask, but not all.
            MainLoop.setImmediate = scheduler.postTask.bind(scheduler);
          } else if (globalThis.setImmediate) {
            MainLoop.setImmediate = setImmediate;
          } else {
            // Emulate setImmediate. (note: not a complete polyfill, we don't emulate clearImmediate() to keep code size to minimum, since not needed)
            var setImmediates = [];
            var emscriptenMainLoopMessageId = 'setimmediate';
            /** @param {Event} event */
            var MainLoop_setImmediate_messageHandler = (event) => {
              if (event.data === emscriptenMainLoopMessageId) {
                event.stopPropagation();
                setImmediates.shift()();
              }
            };
            addEventListener('message', MainLoop_setImmediate_messageHandler, true);
            MainLoop.setImmediate = /** @type{function(function(): ?, ...?): number} */((func) => {
              setImmediates.push(func);
              if (ENVIRONMENT_IS_WORKER) {
                // The postMessge API in a Worker, sends message to the main
                // thread and does not support the `targetOrigin` (*) argument.
                postMessage(emscriptenMainLoopMessageId);
              } else {
                postMessage(emscriptenMainLoopMessageId, '*');
              }
            });
          }
        }
        MainLoop.scheduler = function MainLoop_scheduler_setImmediate() {
          MainLoop.setImmediate(MainLoop.runner);
        };
      }
      return 0;
    };
  var MainLoop = {
  func:null,
  scheduler:null,
  currentlyRunningMainloop:0,
  arg:0,
  timingMode:0,
  timingValue:0,
  currentFrameNumber:0,
  queue:[],
  preMainLoop:[],
  postMainLoop:[],
  pause() {
        if (MainLoop.scheduler) {
          MainLoop.scheduler = null;
          // Incrementing this signals the previous main loop that it's now become old, and it must return.
          MainLoop.currentlyRunningMainloop++;
          
        }
      },
  resume() {
        MainLoop.currentlyRunningMainloop++;
        var timingMode = MainLoop.timingMode;
        var timingValue = MainLoop.timingValue;
        var func = MainLoop.func;
        MainLoop.func = null;
        // do not set timing and call scheduler, we will do it on the next lines
        setMainLoop(func, 0, false, MainLoop.arg, true);
        _emscripten_set_main_loop_timing(timingMode, timingValue);
        MainLoop.scheduler();
      },
  updateStatus() {
        if (Module['setStatus']) {
          var message = Module['statusMessage'] || 'Please wait...';
          var remaining = MainLoop.remainingBlockers ?? 0;
          var expected = MainLoop.expectedBlockers ?? 0;
          if (remaining) {
            if (remaining < expected) {
              Module['setStatus'](`{message} ({expected - remaining}/{expected})`);
            } else {
              Module['setStatus'](message);
            }
          } else {
            Module['setStatus']('');
          }
        }
      },
  init() {
      },
  runIter(func) {
        if (ABORT) return;
        for (var pre of MainLoop.preMainLoop) {
          if (pre() === false) {
            return; // |return false| skips a frame
          }
        }
        callUserCallback(func);
        for (var post of MainLoop.postMainLoop) {
          post();
        }
        checkStackCookie();
      },
  nextRAF:0,
  fakeRequestAnimationFrame(func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (!MainLoop.nextRAF) {
          MainLoop.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= MainLoop.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            MainLoop.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(MainLoop.nextRAF - now, 0);
        setTimeout(func, delay);
      },
  requestAnimationFrame(func) {
        if (globalThis.requestAnimationFrame) {
          requestAnimationFrame(func);
        } else {
          MainLoop.fakeRequestAnimationFrame(func);
        }
      },
  };
  
  
  
  
    /**
   * @param {number=} arg
   * @param {boolean=} noSetTiming
   */
  var setMainLoop = (iterFunc, fps, simulateInfiniteLoop, arg, noSetTiming) => {
      assert(!MainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once')
      MainLoop.func = iterFunc;
      MainLoop.arg = arg;
  
      var thisMainLoopId = MainLoop.currentlyRunningMainloop;
      function checkIsRunning() {
        if (thisMainLoopId < MainLoop.currentlyRunningMainloop) {
          maybeExit();
          return false;
        }
        return true;
      }
  
      // We create the loop runner here but it is not actually running until
      // _emscripten_set_main_loop_timing is called (which might happen at a
      // later time).
      MainLoop.runner = function MainLoop_runner() {
        if (ABORT) return;
        if (MainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = MainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (MainLoop.remainingBlockers) {
            var remaining = MainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              MainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              MainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          MainLoop.updateStatus();
  
          // catches pause/resume main loop from blocker execution
          if (!checkIsRunning()) return;
  
          setTimeout(MainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (!checkIsRunning()) return;
  
        // Implement very basic swap interval control
        MainLoop.currentFrameNumber = MainLoop.currentFrameNumber + 1 | 0;
        if (MainLoop.timingMode == 1 && MainLoop.timingValue > 1 && MainLoop.currentFrameNumber % MainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          MainLoop.scheduler();
          return;
        } else if (MainLoop.timingMode == 0) {
          MainLoop.tickStartTime = _emscripten_get_now();
          if (Module['ctx']) {
            warnOnce('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          }
        }
  
        MainLoop.runIter(iterFunc);
  
        // catch pauses from the main loop itself
        if (!checkIsRunning()) return;
  
        MainLoop.scheduler();
      }
  
      if (!noSetTiming) {
        if (fps > 0) {
          _emscripten_set_main_loop_timing(0, 1000.0 / fps);
        } else {
          // Do rAF by rendering each frame (no decimating)
          _emscripten_set_main_loop_timing(1, 1);
        }
  
        MainLoop.scheduler();
      }
  
      if (simulateInfiniteLoop) {
        throw 'unwind';
      }
    };
  
  var wasmTableMirror = [];
  
  
  var getWasmTableEntry = (funcPtr) => {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        /** @suppress {checkTypes} */
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
      }
      /** @suppress {checkTypes} */
      assert(wasmTable.get(funcPtr) == func, 'table mirror is out of date');
      return func;
    };
  var _emscripten_set_main_loop = (func, fps, simulateInfiniteLoop) => {
      var iterFunc = getWasmTableEntry(func);
      setMainLoop(iterFunc, fps, simulateInfiniteLoop);
    };

  var GLctx;
  
  var webgl_enable_ANGLE_instanced_arrays = (ctx) => {
      // Extension available in WebGL 1 from Firefox 26 and Google Chrome 30 onwards. Core feature in WebGL 2.
      var ext = ctx.getExtension('ANGLE_instanced_arrays');
      // Because this extension is a core function in WebGL 2, assign the extension entry points in place of
      // where the core functions will reside in WebGL 2. This way the calling code can call these without
      // having to dynamically branch depending if running against WebGL 1 or WebGL 2.
      if (ext) {
        ctx['vertexAttribDivisor'] = (index, divisor) => ext['vertexAttribDivisorANGLE'](index, divisor);
        ctx['drawArraysInstanced'] = (mode, first, count, primcount) => ext['drawArraysInstancedANGLE'](mode, first, count, primcount);
        ctx['drawElementsInstanced'] = (mode, count, type, indices, primcount) => ext['drawElementsInstancedANGLE'](mode, count, type, indices, primcount);
        return 1;
      }
    };
  
  var webgl_enable_OES_vertex_array_object = (ctx) => {
      // Extension available in WebGL 1 from Firefox 25 and WebKit 536.28/desktop Safari 6.0.3 onwards. Core feature in WebGL 2.
      var ext = ctx.getExtension('OES_vertex_array_object');
      if (ext) {
        ctx['createVertexArray'] = () => ext['createVertexArrayOES']();
        ctx['deleteVertexArray'] = (vao) => ext['deleteVertexArrayOES'](vao);
        ctx['bindVertexArray'] = (vao) => ext['bindVertexArrayOES'](vao);
        ctx['isVertexArray'] = (vao) => ext['isVertexArrayOES'](vao);
        return 1;
      }
    };
  
  var webgl_enable_WEBGL_draw_buffers = (ctx) => {
      // Extension available in WebGL 1 from Firefox 28 onwards. Core feature in WebGL 2.
      var ext = ctx.getExtension('WEBGL_draw_buffers');
      if (ext) {
        ctx['drawBuffers'] = (n, bufs) => ext['drawBuffersWEBGL'](n, bufs);
        return 1;
      }
    };
  
  var webgl_enable_EXT_polygon_offset_clamp = (ctx) =>
      !!(ctx.extPolygonOffsetClamp = ctx.getExtension('EXT_polygon_offset_clamp'));
  
  var webgl_enable_EXT_clip_control = (ctx) =>
      !!(ctx.extClipControl = ctx.getExtension('EXT_clip_control'));
  
  var webgl_enable_WEBGL_polygon_mode = (ctx) =>
      !!(ctx.webglPolygonMode = ctx.getExtension('WEBGL_polygon_mode'));
  
  var webgl_enable_WEBGL_multi_draw = (ctx) =>
      // Closure is expected to be allowed to minify the '.multiDrawWebgl' property, so not accessing it quoted.
      !!(ctx.multiDrawWebgl = ctx.getExtension('WEBGL_multi_draw'));
  
  var getEmscriptenSupportedExtensions = (ctx) => {
      // Restrict the list of advertised extensions to those that we actually
      // support.
      var supportedExtensions = [
        // WebGL 1 extensions
        'ANGLE_instanced_arrays',
        'EXT_blend_minmax',
        'EXT_disjoint_timer_query',
        'EXT_frag_depth',
        'EXT_shader_texture_lod',
        'EXT_sRGB',
        'OES_element_index_uint',
        'OES_fbo_render_mipmap',
        'OES_standard_derivatives',
        'OES_texture_float',
        'OES_texture_half_float',
        'OES_texture_half_float_linear',
        'OES_vertex_array_object',
        'WEBGL_color_buffer_float',
        'WEBGL_depth_texture',
        'WEBGL_draw_buffers',
        // WebGL 1 and WebGL 2 extensions
        'EXT_clip_control',
        'EXT_color_buffer_half_float',
        'EXT_depth_clamp',
        'EXT_float_blend',
        'EXT_polygon_offset_clamp',
        'EXT_texture_compression_bptc',
        'EXT_texture_compression_rgtc',
        'EXT_texture_filter_anisotropic',
        'KHR_parallel_shader_compile',
        'OES_texture_float_linear',
        'WEBGL_blend_func_extended',
        'WEBGL_compressed_texture_astc',
        'WEBGL_compressed_texture_etc',
        'WEBGL_compressed_texture_etc1',
        'WEBGL_compressed_texture_s3tc',
        'WEBGL_compressed_texture_s3tc_srgb',
        'WEBGL_debug_renderer_info',
        'WEBGL_debug_shaders',
        'WEBGL_lose_context',
        'WEBGL_multi_draw',
        'WEBGL_polygon_mode'
      ];
      // .getSupportedExtensions() can return null if context is lost, so coerce to empty array.
      return ctx.getSupportedExtensions()?.filter(ext => supportedExtensions.includes(ext)) ?? [];
    };
  
  
  
  
  var GL = {
  counter:1,
  buffers:[],
  programs:[],
  framebuffers:[],
  renderbuffers:[],
  textures:[],
  shaders:[],
  vaos:[],
  contexts:[],
  offscreenCanvases:{
  },
  queries:[],
  stringCache:{
  },
  unpackAlignment:4,
  unpackRowLength:0,
  recordError:(errorCode) => {
        if (!GL.lastError) {
          GL.lastError = errorCode;
        }
      },
  getNewId:(table) => {
        var ret = GL.counter++;
        for (var i = table.length; i < ret; i++) {
          table[i] = null;
        }
        return ret;
      },
  genObject:(n, buffers, createFunction, objectTable
        ) => {
        for (var i = 0; i < n; i++) {
          var buffer = GLctx[createFunction]();
          var id = buffer && GL.getNewId(objectTable);
          if (buffer) {
            buffer.name = id;
            objectTable[id] = buffer;
          } else {
            GL.recordError(0x502 /* GL_INVALID_OPERATION */);
          }
          HEAP32[(((buffers)+(i*4))>>2)] = id;
        }
      },
  getSource:(shader, count, string, length) => {
        var source = '';
        for (var i = 0; i < count; ++i) {
          var len = length ? HEAPU32[(((length)+(i*4))>>2)] : undefined;
          source += UTF8ToString(HEAPU32[(((string)+(i*4))>>2)], len);
        }
        return source;
      },
  createContext:(/** @type {HTMLCanvasElement} */ canvas, webGLContextAttributes) => {
  
        // BUG: Workaround Safari WebGL issue: After successfully acquiring WebGL
        // context on a canvas, calling .getContext() will always return that
        // context independent of which 'webgl' or 'webgl2'
        // context version was passed. See:
        //   https://webkit.org/b/222758
        // and:
        //   https://github.com/emscripten-core/emscripten/issues/13295.
        // TODO: Once the bug is fixed and shipped in Safari, adjust the Safari
        // version field in above check.
        if (!canvas.getContextSafariWebGL2Fixed) {
          canvas.getContextSafariWebGL2Fixed = canvas.getContext;
          /** @type {function(this:HTMLCanvasElement, string, (Object|null)=): (RenderingContext|null)} */
          function fixedGetContext(ver, attrs) {
            var gl = canvas.getContextSafariWebGL2Fixed(ver, attrs);
            return ((ver == 'webgl') == (gl instanceof WebGLRenderingContext)) ? gl : null;
          }
          canvas.getContext = fixedGetContext;
        }
  
        var ctx =
          canvas.getContext('webgl', webGLContextAttributes);
  
        if (!ctx) return 0;
  
        var handle = GL.registerContext(ctx, webGLContextAttributes);
  
        return handle;
      },
  registerContext:(ctx, webGLContextAttributes) => {
        // without pthreads a context is just an integer ID
        var handle = GL.getNewId(GL.contexts);
  
        var context = {
          handle,
          attributes: webGLContextAttributes,
          version: webGLContextAttributes.majorVersion,
          GLctx: ctx
        };
  
        // Store the created context object so that we can access the context
        // given a canvas without having to pass the parameters again.
        if (ctx.canvas) ctx.canvas.GLctxObject = context;
        GL.contexts[handle] = context;
        if (typeof webGLContextAttributes.enableExtensionsByDefault == 'undefined' || webGLContextAttributes.enableExtensionsByDefault) {
          GL.initExtensions(context);
        }
  
        return handle;
      },
  makeContextCurrent:(contextHandle) => {
  
        // Active Emscripten GL layer context object.
        GL.currentContext = GL.contexts[contextHandle];
        // Active WebGL context object.
        Module['ctx'] = GLctx = GL.currentContext?.GLctx;
        return !(contextHandle && !GLctx);
      },
  getContext:(contextHandle) => {
        return GL.contexts[contextHandle];
      },
  deleteContext:(contextHandle) => {
        if (GL.currentContext === GL.contexts[contextHandle]) {
          GL.currentContext = null;
        }
        if (typeof JSEvents == 'object') {
          // Release all JS event handlers on the DOM element that the GL context is
          // associated with since the context is now deleted.
          JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);
        }
        // Make sure the canvas object no longer refers to the context object so
        // there are no GC surprises.
        if (GL.contexts[contextHandle]?.GLctx.canvas) {
          GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
        }
        GL.contexts[contextHandle] = null;
      },
  initExtensions:(context) => {
        // If this function is called without a specific context object, init the
        // extensions of the currently active context.
        context ||= GL.currentContext;
  
        if (context.initExtensionsDone) return;
        context.initExtensionsDone = true;
  
        var GLctx = context.GLctx;
  
        // Detect the presence of a few extensions manually, since the GL interop
        // layer itself will need to know if they exist.
  
        // Extensions that are available in both WebGL 1 and WebGL 2
        webgl_enable_WEBGL_multi_draw(GLctx);
        webgl_enable_EXT_polygon_offset_clamp(GLctx);
        webgl_enable_EXT_clip_control(GLctx);
        webgl_enable_WEBGL_polygon_mode(GLctx);
        // Extensions that are only available in WebGL 1 (the calls will be no-ops
        // if called on a WebGL 2 context active)
        webgl_enable_ANGLE_instanced_arrays(GLctx);
        webgl_enable_OES_vertex_array_object(GLctx);
        webgl_enable_WEBGL_draw_buffers(GLctx);
        {
          GLctx.disjointTimerQueryExt = GLctx.getExtension('EXT_disjoint_timer_query');
        }
  
        for (var ext of getEmscriptenSupportedExtensions(GLctx)) {
          // WEBGL_lose_context, WEBGL_debug_renderer_info and WEBGL_debug_shaders
          // are not enabled by default.
          if (!ext.includes('lose_context') && !ext.includes('debug')) {
            // Call .getExtension() to enable that extension permanently.
            GLctx.getExtension(ext);
          }
        }
      },
  };
  
  var webglPowerPreferences = ["default","low-power","high-performance"];
  
  var maybeCStringToJsString = (cString) => {
      // 'cString > 2' checks if the input is a number, and isn't of the special
      // values we accept here, EMSCRIPTEN_EVENT_TARGET_* (which map to 0, 1, 2).
      // In other words, if cString > 2 then it's a pointer to a valid place in
      // memory, and points to a C string.
      return cString > 2 ? UTF8ToString(cString) : cString;
    };
  
  /** @type {Object} */
  var specialHTMLTargets = [0, globalThis.document ?? 0, globalThis.window ?? 0];
  var findEventTarget = (target) => {
      target = maybeCStringToJsString(target);
      var domElement = specialHTMLTargets[target] || globalThis.document?.querySelector(target);
      return domElement;
    };
  var findCanvasEventTarget = findEventTarget;
  
  
  
  var _emscripten_webgl_do_create_context = (target, attributes) => {
      assert(attributes);
      var attr32 = ((attributes)>>2);
      var powerPreference = HEAP32[attr32 + (8>>2)];
      var contextAttributes = {
        'alpha': !!HEAP8[attributes + 0],
        'depth': !!HEAP8[attributes + 1],
        'stencil': !!HEAP8[attributes + 2],
        'antialias': !!HEAP8[attributes + 3],
        'premultipliedAlpha': !!HEAP8[attributes + 4],
        'preserveDrawingBuffer': !!HEAP8[attributes + 5],
        'powerPreference': webglPowerPreferences[powerPreference],
        'failIfMajorPerformanceCaveat': !!HEAP8[attributes + 12],
        'desynchronized': !!HEAP8[attributes + 33],
        // The following are not predefined WebGL context attributes in the WebGL specification, so the property names can be minified by Closure.
        majorVersion: HEAP32[attr32 + (16>>2)],
        minorVersion: HEAP32[attr32 + (20>>2)],
        enableExtensionsByDefault: HEAP8[attributes + 24],
        explicitSwapControl: HEAP8[attributes + 25],
        proxyContextToMainThread: HEAP32[attr32 + (28>>2)],
        renderViaOffscreenBackBuffer: HEAP8[attributes + 32]
      };
  
      //  TODO: Make these into hard errors at some point in the future
      if (contextAttributes.majorVersion !== 1 && contextAttributes.majorVersion !== 2) {
        err(`Invalid WebGL version requested: ${contextAttributes.majorVersion}`);
      }
      if (contextAttributes.majorVersion !== 1) {
        err('WebGL 2 requested but only WebGL 1 is supported (set -sMAX_WEBGL_VERSION=2 to fix the problem)');
      }
  
      var canvas = findCanvasEventTarget(target);
  
      if (!canvas) {
        return 0;
      }
  
      if (contextAttributes.explicitSwapControl) {
        return 0;
      }
  
      var contextHandle = GL.createContext(canvas, contextAttributes);
      return contextHandle;
    };
  var _emscripten_webgl_create_context = _emscripten_webgl_do_create_context;

  var _emscripten_webgl_make_context_current = (contextHandle) => {
      var success = GL.makeContextCurrent(contextHandle);
      return success ? 0 : -5;
    };

  var ENV = {
  };
  
  var getExecutableName = () => thisProgram;
  var getEnvStrings = () => {
      if (!getEnvStrings.strings) {
        // Default values.
        var lang = (globalThis.navigator?.language ?? 'C').replace('-', '_') + '.UTF-8';
        var env = {
          'USER': 'web_user',
          'LOGNAME': 'web_user',
          'PATH': '/',
          'PWD': '/',
          'HOME': '/home/web_user',
          'LANG': lang,
          '_': getExecutableName()
        };
        // Apply the user-provided values, if any.
        for (var x in ENV) {
          // x is a key in ENV; if ENV[x] is undefined, that means it was
          // explicitly set to be so. We allow user code to do that to
          // force variables with default values to remain unset.
          if (ENV[x] === undefined) delete env[x];
          else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(`${x}=${env[x]}`);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    };
  
  
  var _environ_get = (__environ, environ_buf) => {
      var bufSize = 0;
      var envp = 0;
      for (var string of getEnvStrings()) {
        var ptr = environ_buf + bufSize;
        HEAPU32[(((__environ)+(envp))>>2)] = ptr;
        bufSize += stringToUTF8(string, ptr, Infinity) + 1;
        envp += 4;
      }
      return 0;
    };

  
  
  var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
      var strings = getEnvStrings();
      HEAPU32[((penviron_count)>>2)] = strings.length;
      var bufSize = 0;
      for (var string of strings) {
        bufSize += lengthBytesUTF8(string) + 1;
      }
      HEAPU32[((penviron_buf_size)>>2)] = bufSize;
      return 0;
    };

  function _fd_close(fd) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }
  

  
  /** @param {number=} offset */
  var doReadv = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        try {
          var curr = FS.read(stream, HEAP8, ptr, len, offset);
        } catch (e) {
          // On a non-blocking stream a subsequent read may would-block after we
          // already gathered data. POSIX readv is a single gather-read: return
          // what we have rather than failing the whole call.
          if (ret > 0 && e instanceof FS.ErrnoError &&
              (e.errno == 6 || e.errno == 6)) {
            break;
          }
          throw e;
        }
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break; // nothing more to read
        if (typeof offset != 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
  
  
  function _fd_read(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doReadv(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }
  

  
  var INT53_MAX = 9007199254740992;
  
  var INT53_MIN = -9007199254740992;
  var bigintToI53Checked = (num) => (num < INT53_MIN || num > INT53_MAX) ? NaN : Number(num);
  
  function _fd_seek(fd, offset, whence, newOffset) {
    offset = bigintToI53Checked(offset);
  
  
  try {
  
      if (isNaN(offset)) return 22;
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.llseek(stream, offset, whence);
      HEAP64[((newOffset)>>3)] = BigInt(stream.position);
      if (stream.getdents && !offset && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  ;
  }

  
  
  /** @param {number=} offset */
  var doWritev = (stream, iov, iovcnt, offset) => {
      // Gather all iovecs into one contiguous buffer and issue a single
      // FS.write, matching POSIX writev's single gather-write semantics (as
      // __syscall_sendmsg already does). Per-iovec writes fragment a stream
      // socket send into multiple segments, breaking stream byte semantics.
      if (iovcnt == 1) {
        // Single iovec: write directly from HEAP8, no gather buffer needed.
        return FS.write(stream, HEAP8, HEAPU32[((iov)>>2)], HEAPU32[(((iov)+(4))>>2)], offset);
      }
      var total = 0;
      for (var i = 0, p = iov; i < iovcnt; i++, p += 8) {
        total += HEAPU32[(((p)+(4))>>2)];
      }
      var view = new Uint8Array(total);
      var voff = 0;
      for (var i = 0; i < iovcnt; i++, iov += 8) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        view.set(HEAPU8.subarray(ptr, ptr + len), voff);
        voff += len;
      }
      return FS.write(stream, view, 0, total, offset);
    };
  
  
  function _fd_write(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doWritev(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }
  

  var _emscripten_glActiveTexture = (x0) => GLctx.activeTexture(x0);
  var _glActiveTexture = _emscripten_glActiveTexture;

  var _emscripten_glAttachShader = (program, shader) => {
      GLctx.attachShader(GL.programs[program], GL.shaders[shader]);
    };
  var _glAttachShader = _emscripten_glAttachShader;

  
  var _emscripten_glBindAttribLocation = (program, index, name) => {
      GLctx.bindAttribLocation(GL.programs[program], index, UTF8ToString(name));
    };
  var _glBindAttribLocation = _emscripten_glBindAttribLocation;

  var _emscripten_glBindBuffer = (target, buffer) => {
  
      GLctx.bindBuffer(target, GL.buffers[buffer]);
    };
  var _glBindBuffer = _emscripten_glBindBuffer;

  var _emscripten_glBindFramebuffer = (target, framebuffer) => {
  
      GLctx.bindFramebuffer(target, GL.framebuffers[framebuffer]);
  
    };
  var _glBindFramebuffer = _emscripten_glBindFramebuffer;

  var _emscripten_glBindTexture = (target, texture) => {
      GLctx.bindTexture(target, GL.textures[texture]);
    };
  var _glBindTexture = _emscripten_glBindTexture;

  var _emscripten_glBlendFunc = (x0, x1) => GLctx.blendFunc(x0, x1);
  var _glBlendFunc = _emscripten_glBlendFunc;

  
  var _emscripten_glBufferData = (target, size, data, usage) => {
  
      // N.b. here first form specifies a heap subarray, second form an integer
      // size, so the ?: code here is polymorphic. It is advised to avoid
      // randomly mixing both uses in calling code, to avoid any potential JS
      // engine JIT issues.
      GLctx.bufferData(target, data ? HEAPU8.subarray(data, data+size) : size, usage);
    };
  var _glBufferData = _emscripten_glBufferData;

  var _emscripten_glCheckFramebufferStatus = (x0) => GLctx.checkFramebufferStatus(x0);
  var _glCheckFramebufferStatus = _emscripten_glCheckFramebufferStatus;

  var _emscripten_glClear = (x0) => GLctx.clear(x0);
  var _glClear = _emscripten_glClear;

  var _emscripten_glClearColor = (x0, x1, x2, x3) => GLctx.clearColor(x0, x1, x2, x3);
  var _glClearColor = _emscripten_glClearColor;

  var _emscripten_glCompileShader = (shader) => {
      GLctx.compileShader(GL.shaders[shader]);
    };
  var _glCompileShader = _emscripten_glCompileShader;

  var _emscripten_glCreateProgram = () => {
      var id = GL.getNewId(GL.programs);
      var program = GLctx.createProgram();
      // Store additional information needed for each shader program:
      program.name = id;
      // Lazy cache results of
      // glGetProgramiv(GL_ACTIVE_UNIFORM_MAX_LENGTH/GL_ACTIVE_ATTRIBUTE_MAX_LENGTH/GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH)
      program.maxUniformLength = program.maxAttributeLength = program.maxUniformBlockNameLength = 0;
      program.uniformIdCounter = 1;
      GL.programs[id] = program;
      return id;
    };
  var _glCreateProgram = _emscripten_glCreateProgram;

  var _emscripten_glCreateShader = (shaderType) => {
      var id = GL.getNewId(GL.shaders);
      GL.shaders[id] = GLctx.createShader(shaderType);
  
      return id;
    };
  var _glCreateShader = _emscripten_glCreateShader;

  
  var _emscripten_glDeleteBuffers = (n, buffers) => {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((buffers)+(i*4))>>2)];
        var buffer = GL.buffers[id];
  
        // From spec: "glDeleteBuffers silently ignores 0's and names that do not
        // correspond to existing buffer objects."
        if (!buffer) continue;
  
        GLctx.deleteBuffer(buffer);
        buffer.name = 0;
        GL.buffers[id] = null;
  
      }
    };
  var _glDeleteBuffers = _emscripten_glDeleteBuffers;

  
  var _emscripten_glDeleteFramebuffers = (n, framebuffers) => {
      for (var i = 0; i < n; ++i) {
        var id = HEAP32[(((framebuffers)+(i*4))>>2)];
        var framebuffer = GL.framebuffers[id];
        if (!framebuffer) continue; // GL spec: "glDeleteFramebuffers silently ignores 0s and names that do not correspond to existing framebuffer objects".
        GLctx.deleteFramebuffer(framebuffer);
        framebuffer.name = 0;
        GL.framebuffers[id] = null;
      }
    };
  var _glDeleteFramebuffers = _emscripten_glDeleteFramebuffers;

  var _emscripten_glDeleteProgram = (id) => {
      if (!id) return;
      var program = GL.programs[id];
      if (!program) {
        // glDeleteProgram actually signals an error when deleting a nonexisting
        // object, unlike some other GL delete functions.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      GLctx.deleteProgram(program);
      program.name = 0;
      GL.programs[id] = null;
    };
  var _glDeleteProgram = _emscripten_glDeleteProgram;

  
  var _emscripten_glDeleteTextures = (n, textures) => {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((textures)+(i*4))>>2)];
        var texture = GL.textures[id];
        // GL spec: "glDeleteTextures silently ignores 0s and names that do not
        // correspond to existing textures".
        if (!texture) continue;
        GLctx.deleteTexture(texture);
        texture.name = 0;
        GL.textures[id] = null;
      }
    };
  var _glDeleteTextures = _emscripten_glDeleteTextures;

  var _emscripten_glDepthMask = (flag) => {
      GLctx.depthMask(!!flag);
    };
  var _glDepthMask = _emscripten_glDepthMask;

  var _emscripten_glDisable = (x0) => GLctx.disable(x0);
  var _glDisable = _emscripten_glDisable;

  var _emscripten_glDisableVertexAttribArray = (index) => {
      GLctx.disableVertexAttribArray(index);
    };
  var _glDisableVertexAttribArray = _emscripten_glDisableVertexAttribArray;

  var _emscripten_glDrawArrays = (mode, first, count) => {
  
      GLctx.drawArrays(mode, first, count);
  
    };
  var _glDrawArrays = _emscripten_glDrawArrays;

  
  var webglBufferSubData = (target, offset, size, data, src = HEAPU8) => {
      GLctx.bufferSubData(target, offset, src.subarray(data, data + size));
    };
  
  var _emscripten_glDrawElements = (mode, count, type, indices) => {
  
      GLctx.drawElements(mode, count, type, indices);
  
    };
  var _glDrawElements = _emscripten_glDrawElements;

  var _emscripten_glEnable = (x0) => GLctx.enable(x0);
  var _glEnable = _emscripten_glEnable;

  var _emscripten_glEnableVertexAttribArray = (index) => {
      GLctx.enableVertexAttribArray(index);
    };
  var _glEnableVertexAttribArray = _emscripten_glEnableVertexAttribArray;

  var _emscripten_glFramebufferTexture2D = (target, attachment, textarget, texture, level) => {
      GLctx.framebufferTexture2D(target, attachment, textarget,
                                      GL.textures[texture], level);
    };
  var _glFramebufferTexture2D = _emscripten_glFramebufferTexture2D;

  var _emscripten_glGenBuffers = (n, buffers) => {
      GL.genObject(n, buffers, 'createBuffer', GL.buffers
        );
    };
  var _glGenBuffers = _emscripten_glGenBuffers;

  var _emscripten_glGenFramebuffers = (n, ids) => {
      GL.genObject(n, ids, 'createFramebuffer', GL.framebuffers
        );
    };
  var _glGenFramebuffers = _emscripten_glGenFramebuffers;

  var _emscripten_glGenTextures = (n, textures) => {
      GL.genObject(n, textures, 'createTexture', GL.textures
        );
    };
  var _glGenTextures = _emscripten_glGenTextures;

  var _emscripten_glGenerateMipmap = (x0) => GLctx.generateMipmap(x0);
  var _glGenerateMipmap = _emscripten_glGenerateMipmap;

  
  var _emscripten_glGetProgramiv = (program, pname, p) => {
      if (!p) {
        // GLES2 specification does not specify how to behave if p is a null
        // pointer. Since calling this function does not make sense if p == null,
        // issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
  
      if (program >= GL.counter) {
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
  
      program = GL.programs[program];
  
      if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        var log = GLctx.getProgramInfoLog(program);
        if (log === null) log = '(unknown error)';
        HEAP32[((p)>>2)] = log.length + 1;
      } else if (pname == 0x8B87 /* GL_ACTIVE_UNIFORM_MAX_LENGTH */) {
        if (!program.maxUniformLength) {
          var numActiveUniforms = GLctx.getProgramParameter(program, 0x8B86/*GL_ACTIVE_UNIFORMS*/);
          for (var i = 0; i < numActiveUniforms; ++i) {
            program.maxUniformLength = Math.max(program.maxUniformLength, GLctx.getActiveUniform(program, i).name.length+1);
          }
        }
        HEAP32[((p)>>2)] = program.maxUniformLength;
      } else if (pname == 0x8B8A /* GL_ACTIVE_ATTRIBUTE_MAX_LENGTH */) {
        if (!program.maxAttributeLength) {
          var numActiveAttributes = GLctx.getProgramParameter(program, 0x8B89/*GL_ACTIVE_ATTRIBUTES*/);
          for (var i = 0; i < numActiveAttributes; ++i) {
            program.maxAttributeLength = Math.max(program.maxAttributeLength, GLctx.getActiveAttrib(program, i).name.length+1);
          }
        }
        HEAP32[((p)>>2)] = program.maxAttributeLength;
      } else if (pname == 0x8A35 /* GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH */) {
        if (!program.maxUniformBlockNameLength) {
          var numActiveUniformBlocks = GLctx.getProgramParameter(program, 0x8A36/*GL_ACTIVE_UNIFORM_BLOCKS*/);
          for (var i = 0; i < numActiveUniformBlocks; ++i) {
            program.maxUniformBlockNameLength = Math.max(program.maxUniformBlockNameLength, GLctx.getActiveUniformBlockName(program, i).length+1);
          }
        }
        HEAP32[((p)>>2)] = program.maxUniformBlockNameLength;
      } else {
        HEAP32[((p)>>2)] = GLctx.getProgramParameter(program, pname);
      }
    };
  var _glGetProgramiv = _emscripten_glGetProgramiv;

  
  
  var _emscripten_glGetShaderInfoLog = (shader, maxLength, length, infoLog) => {
      var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
      if (log === null) log = '(unknown error)';
      var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
      if (length) HEAP32[((length)>>2)] = numBytesWrittenExclNull;
    };
  var _glGetShaderInfoLog = _emscripten_glGetShaderInfoLog;

  
  var _emscripten_glGetShaderiv = (shader, pname, p) => {
      if (!p) {
        // GLES2 specification does not specify how to behave if p is a null
        // pointer. Since calling this function does not make sense if p == null,
        // issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
        if (log === null) log = '(unknown error)';
        // The GLES2 specification says that if the shader has an empty info log,
        // a value of 0 is returned. Otherwise the log has a null char appended.
        // (An empty string is falsey, so we can just check that instead of
        // looking at log.length.)
        var logLength = log ? log.length + 1 : 0;
        HEAP32[((p)>>2)] = logLength;
      } else if (pname == 0x8B88) { // GL_SHADER_SOURCE_LENGTH
        var source = GLctx.getShaderSource(GL.shaders[shader]);
        // source may be a null, or the empty string, both of which are falsey
        // values that we report a 0 length for.
        var sourceLength = source ? source.length + 1 : 0;
        HEAP32[((p)>>2)] = sourceLength;
      } else {
        HEAP32[((p)>>2)] = GLctx.getShaderParameter(GL.shaders[shader], pname);
      }
    };
  var _glGetShaderiv = _emscripten_glGetShaderiv;

  /** @suppress {checkTypes} */
  var jstoi_q = (str) => parseInt(str);
  
  /** @noinline */
  var webglGetLeftBracePos = (name) => name.slice(-1) == ']' && name.lastIndexOf('[');
  
  var webglPrepareUniformLocationsBeforeFirstUse = (program) => {
      var uniformLocsById = program.uniformLocsById, // Maps GLuint -> WebGLUniformLocation
        uniformSizeAndIdsByName = program.uniformSizeAndIdsByName, // Maps name -> [uniform array length, GLuint]
        i, j;
  
      // On the first time invocation of glGetUniformLocation on this shader program:
      // initialize cache data structures and discover which uniforms are arrays.
      if (!uniformLocsById) {
        // maps GLint integer locations to WebGLUniformLocations
        program.uniformLocsById = uniformLocsById = {};
        // maps integer locations back to uniform name strings, so that we can lazily fetch uniform array locations
        program.uniformArrayNamesById = {};
  
        var numActiveUniforms = GLctx.getProgramParameter(program, 0x8B86/*GL_ACTIVE_UNIFORMS*/);
        for (i = 0; i < numActiveUniforms; ++i) {
          var u = GLctx.getActiveUniform(program, i);
          var nm = u.name;
          var sz = u.size;
          var lb = webglGetLeftBracePos(nm);
          var arrayName = lb > 0 ? nm.slice(0, lb) : nm;
  
          // Assign a new location.
          var id = program.uniformIdCounter;
          program.uniformIdCounter += sz;
          // Eagerly get the location of the uniformArray[0] base element.
          // The remaining indices >0 will be left for lazy evaluation to
          // improve performance. Those may never be needed to fetch, if the
          // application fills arrays always in full starting from the first
          // element of the array.
          uniformSizeAndIdsByName[arrayName] = [sz, id];
  
          // Store placeholder integers in place that highlight that these
          // >0 index locations are array indices pending population.
          for (j = 0; j < sz; ++j) {
            uniformLocsById[id] = j;
            program.uniformArrayNamesById[id++] = arrayName;
          }
        }
      }
    };
  
  
  
  var _emscripten_glGetUniformLocation = (program, name) => {
  
      name = UTF8ToString(name);
  
      if (program = GL.programs[program]) {
        webglPrepareUniformLocationsBeforeFirstUse(program);
        var uniformLocsById = program.uniformLocsById; // Maps GLuint -> WebGLUniformLocation
        var arrayIndex = 0;
        var uniformBaseName = name;
  
        // Invariant: when populating integer IDs for uniform locations, we must
        // maintain the precondition that arrays reside in contiguous addresses,
        // i.e. for a 'vec4 colors[10];', colors[4] must be at location
        // colors[0]+4.  However, user might call glGetUniformLocation(program,
        // "colors") for an array, so we cannot discover based on the user input
        // arguments whether the uniform we are dealing with is an array. The only
        // way to discover which uniforms are arrays is to enumerate over all the
        // active uniforms in the program.
        var leftBrace = webglGetLeftBracePos(name);
  
        // If user passed an array accessor "[index]", parse the array index off the accessor.
        if (leftBrace > 0) {
          arrayIndex = jstoi_q(name.slice(leftBrace + 1)) >>> 0; // "index]", coerce parseInt(']') with >>>0 to treat "foo[]" as "foo[0]" and foo[-1] as unsigned out-of-bounds.
          uniformBaseName = name.slice(0, leftBrace);
        }
  
        // Have we cached the location of this uniform before?
        // A pair [array length, GLint of the uniform location]
        var sizeAndId = program.uniformSizeAndIdsByName[uniformBaseName];
  
        // If a uniform with this name exists, and if its index is within the
        // array limits (if it's even an array), query the WebGLlocation, or
        // return an existing cached location.
        if (sizeAndId && arrayIndex < sizeAndId[0]) {
          arrayIndex += sizeAndId[1]; // Add the base location of the uniform to the array index offset.
          if ((uniformLocsById[arrayIndex] = uniformLocsById[arrayIndex] || GLctx.getUniformLocation(program, name))) {
            return arrayIndex;
          }
        }
      }
      else {
        // N.b. we are currently unable to distinguish between GL program IDs that
        // never existed vs GL program IDs that have been deleted, so report
        // GL_INVALID_VALUE in both cases.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
      }
      return -1;
    };
  var _glGetUniformLocation = _emscripten_glGetUniformLocation;

  var _emscripten_glLinkProgram = (program) => {
      program = GL.programs[program];
      GLctx.linkProgram(program);
      // Invalidate earlier computed uniform->ID mappings, those have now become stale
      program.uniformLocsById = 0; // Mark as null-like so that glGetUniformLocation() knows to populate this again.
      program.uniformSizeAndIdsByName = {};
  
    };
  var _glLinkProgram = _emscripten_glLinkProgram;

  var computeUnpackAlignedImageSize = (width, height, sizePerPixel) => {
      function roundedToNextMultipleOf(x, y) {
        return (x + y - 1) & -y;
      }
      var plainRowSize = (GL.unpackRowLength || width) * sizePerPixel;
      var alignedRowSize = roundedToNextMultipleOf(plainRowSize, GL.unpackAlignment);
      return height * alignedRowSize;
    };
  
  var colorChannelsInGlTextureFormat = (format) => {
      // Micro-optimizations for size: map format to size by subtracting smallest
      // enum value (0x1902) from all values first.  Also omit the most common
      // size value (1) from the list, which is assumed by formats not on the
      // list.
      var colorChannels = {
        // 0x1902 /* GL_DEPTH_COMPONENT */ - 0x1902: 1,
        // 0x1906 /* GL_ALPHA */ - 0x1902: 1,
        5: 3,
        6: 4,
        // 0x1909 /* GL_LUMINANCE */ - 0x1902: 1,
        8: 2,
        29502: 3,
        29504: 4,
      };
      return colorChannels[format - 0x1902]||1;
    };
  
  
  
  /** @type {!Uint16Array} */
  var HEAPU16;
  
  
  
  /** @type {!Float32Array} */
  var HEAPF32;
  var heapObjectForWebGLType = (type) => {
      // Micro-optimization for size: Subtract lowest GL enum number (0x1400/* GL_BYTE */) from type to compare
      // smaller values for the heap, for shorter generated code size.
      // Also the type HEAPU16 is not tested for explicitly, but any unrecognized type will return out HEAPU16.
      // (since most types are HEAPU16)
      type -= 0x1400;
  
      if (type == 1) return HEAPU8;
  
      if (type == 4) return HEAP32;
  
      if (type == 6) return HEAPF32;
  
      if (type == 5
        || type == 28922
        )
        return HEAPU32;
  
      return HEAPU16;
    };
  
  var toTypedArrayIndex = (pointer, heap) =>
      pointer >>> (31 - Math.clz32(heap.BYTES_PER_ELEMENT));
  
  var emscriptenWebGLGetTexPixelData = (type, format, width, height, pixels) => {
      var heap = heapObjectForWebGLType(type);
      var sizePerPixel = colorChannelsInGlTextureFormat(format) * heap.BYTES_PER_ELEMENT;
      var bytes = computeUnpackAlignedImageSize(width, height, sizePerPixel);
      return heap.subarray(toTypedArrayIndex(pixels, heap), toTypedArrayIndex(pixels + bytes, heap));
    };
  
  var _emscripten_glReadPixels = (x, y, width, height, format, type, pixels) => {
      var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels);
      if (!pixelData) {
        GL.recordError(0x500/*GL_INVALID_ENUM*/);
        return;
      }
      GLctx.readPixels(x, y, width, height, format, type, pixelData);
    };
  var _glReadPixels = _emscripten_glReadPixels;

  var _emscripten_glShaderSource = (shader, count, string, length) => {
      var source = GL.getSource(shader, count, string, length);
  
      GLctx.shaderSource(GL.shaders[shader], source);
    };
  var _glShaderSource = _emscripten_glShaderSource;

  
  var _emscripten_glTexImage2D = (target, level, internalFormat, width, height, border, format, type, pixels) => {
      var pixelData = pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels) : null;
      GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixelData);
    };
  var _glTexImage2D = _emscripten_glTexImage2D;

  var _emscripten_glTexParameteri = (x0, x1, x2) => GLctx.texParameteri(x0, x1, x2);
  var _glTexParameteri = _emscripten_glTexParameteri;

  
  var webglGetProgramUniformLocation = (program, location) => {
  
      if (program) {
        var webglLoc = program.uniformLocsById[location];
        // program.uniformLocsById[location] stores either an integer, or a
        // WebGLUniformLocation.
        // If an integer, we have not yet bound the location, so do it now. The
        // integer value specifies the array index we should bind to.
        if (typeof webglLoc == 'number') {
          program.uniformLocsById[location] = webglLoc = GLctx.getUniformLocation(program, program.uniformArrayNamesById[location] + (webglLoc > 0 ? `[${webglLoc}]` : ''));
        }
        // Else an already cached WebGLUniformLocation, return it.
        return webglLoc;
      } else {
        GL.recordError(0x502/*GL_INVALID_OPERATION*/);
      }
    };
  
  var webglGetUniformLocation = (location) => {
  
      return webglGetProgramUniformLocation(GLctx.currentProgram, location);
    };
  
  var _emscripten_glUniform1f = (location, v0) => {
      GLctx.uniform1f(webglGetUniformLocation(location), v0);
    };
  var _glUniform1f = _emscripten_glUniform1f;

  
  var _emscripten_glUniform1i = (location, v0) => {
      GLctx.uniform1i(webglGetUniformLocation(location), v0);
    };
  var _glUniform1i = _emscripten_glUniform1i;

  
  var _emscripten_glUniform3f = (location, v0, v1, v2) => {
      GLctx.uniform3f(webglGetUniformLocation(location), v0, v1, v2);
    };
  var _glUniform3f = _emscripten_glUniform3f;

  
  var miniTempWebGLFloatBuffers = [];
  
  
  var _emscripten_glUniform3fv = (location, count, value) => {
  
      if (count <= 96) {
        // avoid allocation when uploading few enough uniforms
        count *= 3;
        var view = miniTempWebGLFloatBuffers[count];
        for (var i = 0; i < count; i += 3) {
          view[i] = HEAPF32[(((value)+(4*i))>>2)];
          view[i+1] = HEAPF32[(((value)+(4*i+4))>>2)];
          view[i+2] = HEAPF32[(((value)+(4*i+8))>>2)];
        }
      } else
      {
        var view = HEAPF32.subarray((((value)>>2)), ((value+count*12)>>2));
      }
      GLctx.uniform3fv(webglGetUniformLocation(location), view);
    };
  var _glUniform3fv = _emscripten_glUniform3fv;

  
  
  
  var _emscripten_glUniformMatrix4fv = (location, count, transpose, value) => {
  
      if (count <= 18) {
        // avoid allocation when uploading few enough uniforms
        var view = miniTempWebGLFloatBuffers[16*count];
        // hoist the heap out of the loop for size and for pthreads+growth.
        var heap = HEAPF32;
        value = ((value)>>2);
        count *= 16;
        for (var i = 0; i < count; i += 16) {
          var dst = value + i;
          view[i] = heap[dst];
          view[i + 1] = heap[dst + 1];
          view[i + 2] = heap[dst + 2];
          view[i + 3] = heap[dst + 3];
          view[i + 4] = heap[dst + 4];
          view[i + 5] = heap[dst + 5];
          view[i + 6] = heap[dst + 6];
          view[i + 7] = heap[dst + 7];
          view[i + 8] = heap[dst + 8];
          view[i + 9] = heap[dst + 9];
          view[i + 10] = heap[dst + 10];
          view[i + 11] = heap[dst + 11];
          view[i + 12] = heap[dst + 12];
          view[i + 13] = heap[dst + 13];
          view[i + 14] = heap[dst + 14];
          view[i + 15] = heap[dst + 15];
        }
      } else
      {
        var view = HEAPF32.subarray((((value)>>2)), ((value+count*64)>>2));
      }
      GLctx.uniformMatrix4fv(webglGetUniformLocation(location), !!transpose, view);
    };
  var _glUniformMatrix4fv = _emscripten_glUniformMatrix4fv;

  var _emscripten_glUseProgram = (program) => {
      program = GL.programs[program];
      GLctx.useProgram(program);
      // Record the currently active program so that we can access the uniform
      // mapping table of that program.
      GLctx.currentProgram = program;
    };
  var _glUseProgram = _emscripten_glUseProgram;

  var _emscripten_glVertexAttribPointer = (index, size, type, normalized, stride, ptr) => {
      GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
    };
  var _glVertexAttribPointer = _emscripten_glVertexAttribPointer;

  var _emscripten_glViewport = (x0, x1, x2, x3) => GLctx.viewport(x0, x1, x2, x3);
  var _glViewport = _emscripten_glViewport;





  var getCFunc = (ident) => {
      var func = Module['_' + ident]; // closure exported function
      assert(func, `Cannot call unknown function ${ident}, make sure it is exported`);
      return func;
    };
  
  var writeArrayToMemory = (array, buffer) => {
      assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
      HEAP8.set(array, buffer);
    };
  
  
  
  var stringToUTF8OnStack = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    };
  
  
  
  
  
    /**
   * @param {string|null=} returnType
   * @param {Array=} argTypes
   * @param {Array=} args
   * @param {Object=} opts
   */
  var ccall = (ident, returnType, argTypes, args, opts) => {
      // For fast lookup of conversion functions
      var toC = {
        'string': (str) => {
          var ret = 0;
          if (str !== null && str !== undefined && str !== 0) { // null string
            ret = stringToUTF8OnStack(str);
          }
          return ret;
        },
        'array': (arr) => {
          var ret = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret);
          return ret;
        }
      };
  
      function convertReturnValue(ret) {
        if (returnType === 'string') {
          return UTF8ToString(ret);
        }
        if (returnType === 'boolean') return Boolean(ret);
        return ret;
      }
  
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert(returnType !== 'array', 'return type should not be "array"');
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (!stack) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func(...cArgs);
      function onDone(ret) {
        if (stack) stackRestore(stack);
        return convertReturnValue(ret);
      }
  
      ret = onDone(ret);
      return ret;
    };

  var FS_createPath = (...args) => FS.createPath(...args);



  var FS_unlink = (...args) => FS.unlink(...args);

  var FS_createLazyFile = (...args) => FS.createLazyFile(...args);

  var FS_createDevice = (...args) => FS.createDevice(...args);



  FS.createPreloadedFile = FS_createPreloadedFile;
  FS.preloadFile = FS_preloadFile;
  FS.staticInit();;

      Module['requestAnimationFrame'] = MainLoop.requestAnimationFrame;
      Module['pauseMainLoop'] = MainLoop.pause;
      Module['resumeMainLoop'] = MainLoop.resume;
      MainLoop.init();;
var miniTempWebGLFloatBuffersStorage = new Float32Array(288);
  // Create GL_POOL_TEMP_BUFFERS_SIZE+1 temporary buffers, for uploads of size 0 through GL_POOL_TEMP_BUFFERS_SIZE inclusive
  for (/**@suppress{duplicate}*/var i = 0; i <= 288; ++i) {
    miniTempWebGLFloatBuffers[i] = miniTempWebGLFloatBuffersStorage.subarray(0, i);
  };
// End JS library code

// include: postlibrary.js
// This file is included after the automatically-generated JS library code
// but before the wasm module is created.

{

  // Begin ATMODULES hooks
  if (Module['noExitRuntime']) noExitRuntime = Module['noExitRuntime'];

if (Module['print']) out = Module['print'];
if (Module['printErr']) err = Module['printErr'];
  // End ATMODULES hooks

  checkIncomingModuleAPI();

  if (Module['arguments']) programArgs = Module['arguments'];
  if (Module['thisProgram']) thisProgram = Module['thisProgram'];

  // Assertions on removed incoming Module JS APIs.
  assert(typeof Module['memoryInitializerPrefixURL'] == 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['pthreadMainPrefixURL'] == 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['cdInitializerPrefixURL'] == 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['filePackagePrefixURL'] == 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['read'] == 'undefined', 'Module.read option was removed');
  assert(typeof Module['readAsync'] == 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
  assert(typeof Module['readBinary'] == 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
  assert(typeof Module['setWindowTitle'] == 'undefined', 'Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)');
  assert(typeof Module['TOTAL_MEMORY'] == 'undefined', 'Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY');
  assert(typeof Module['ENVIRONMENT'] == 'undefined', 'Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)');
  assert(typeof Module['STACK_SIZE'] == 'undefined', 'STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time')
  // If memory is defined in wasm, the user can't provide it, or set INITIAL_MEMORY
  assert(typeof Module['wasmMemory'] == 'undefined', 'Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally');
  assert(typeof Module['INITIAL_MEMORY'] == 'undefined', 'Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically');

  var preInit = Module['preInit'];
  if (preInit) {
    if (typeof preInit == 'function') Module['preInit'] = preInit = [preInit];
    // Written as a loop so that preInit functions that themselves add more
    // preInit functions.  Is this actually needed?
    while (preInit.length > 0) {
      preInit.shift()();
    }
  }
  consumedModuleProp('preInit');
}

// Begin runtime exports
  Module['addRunDependency'] = addRunDependency;
  Module['removeRunDependency'] = removeRunDependency;
  Module['ccall'] = ccall;
  Module['FS_preloadFile'] = FS_preloadFile;
  Module['FS_unlink'] = FS_unlink;
  Module['FS_createPath'] = FS_createPath;
  Module['FS_createDevice'] = FS_createDevice;
  Module['FS_createDataFile'] = FS_createDataFile;
  Module['FS_createLazyFile'] = FS_createLazyFile;
  var missingLibrarySymbols = [
  'writeI53ToI64',
  'writeI53ToI64Clamped',
  'writeI53ToI64Signaling',
  'writeI53ToU64Clamped',
  'writeI53ToU64Signaling',
  'readI53FromI64',
  'readI53FromU64',
  'convertI32PairToI53',
  'convertI32PairToI53Checked',
  'convertU32PairToI53',
  'getTempRet0',
  'createNamedFunction',
  'zeroMemory',
  'withStackSave',
  'inetPton4',
  'inetNtop4',
  'inetPton6',
  'inetNtop6',
  'readSockaddr',
  'writeSockaddr',
  'readEmAsmArgs',
  'autoResumeAudioContext',
  'getDynCaller',
  'dynCall',
  'runtimeKeepalivePush',
  'runtimeKeepalivePop',
  'asmjsMangle',
  'HandleAllocator',
  'addOnInit',
  'addOnPostCtor',
  'addOnPreMain',
  'addOnExit',
  'STACK_SIZE',
  'STACK_ALIGN',
  'POINTER_SIZE',
  'ASSERTIONS',
  'cwrap',
  'convertJsFunctionToWasm',
  'getEmptyTableSlot',
  'updateTableMap',
  'getFunctionAddress',
  'addFunction',
  'removeFunction',
  'setValue',
  'getValue',
  'intArrayToString',
  'AsciiToString',
  'stringToAscii',
  'UTF16ToString',
  'stringToUTF16',
  'lengthBytesUTF16',
  'UTF32ToString',
  'stringToUTF32',
  'lengthBytesUTF32',
  'stringToNewUTF8',
  'registerKeyEventCallback',
  'getBoundingClientRect',
  'fillMouseEventData',
  'registerMouseEventCallback',
  'registerWheelEventCallback',
  'registerUiEventCallback',
  'registerFocusEventCallback',
  'fillDeviceOrientationEventData',
  'registerDeviceOrientationEventCallback',
  'fillDeviceMotionEventData',
  'registerDeviceMotionEventCallback',
  'screenOrientation',
  'fillOrientationChangeEventData',
  'registerOrientationChangeEventCallback',
  'fillFullscreenChangeEventData',
  'registerFullscreenChangeEventCallback',
  'callCanvasResizedCallback',
  'JSEvents_requestFullscreen',
  'JSEvents_resizeCanvasForFullscreen',
  'registerRestoreOldStyle',
  'hideEverythingExceptGivenElement',
  'restoreHiddenElements',
  'setLetterbox',
  'currentFullscreenStrategy',
  'softFullscreenResizeWebGLRenderTarget',
  'doRequestFullscreen',
  'fillPointerlockChangeEventData',
  'registerPointerlockChangeEventCallback',
  'registerPointerlockErrorEventCallback',
  'requestPointerLock',
  'fillVisibilityChangeEventData',
  'registerVisibilityChangeEventCallback',
  'registerTouchEventCallback',
  'fillGamepadEventData',
  'registerGamepadEventCallback',
  'registerBeforeUnloadEventCallback',
  'fillBatteryEventData',
  'registerBatteryEventCallback',
  'setCanvasElementSize',
  'getCanvasElementSize',
  'jsStackTrace',
  'getCallstack',
  'convertPCtoSourceLocation',
  'checkWasiClock',
  'wasiRightsToMuslOFlags',
  'wasiOFlagsToMuslOFlags',
  'safeSetTimeout',
  'safeClearTimeout',
  'setImmediateWrapped',
  'safeRequestAnimationFrame',
  'clearImmediateWrapped',
  'registerPostMainLoop',
  'registerPreMainLoop',
  'getPromise',
  'makePromise',
  'addPromise',
  'idsToPromises',
  'makePromiseCallback',
  'incrementUncaughtExceptionCount',
  'decrementUncaughtExceptionCount',
  'Browser_asyncPrepareDataCounter',
  'isLeapYear',
  'ydayFromDate',
  'arraySum',
  'addDays',
  'getSocketFromFD',
  'getSocketAddress',
  'FS_mkdirTree',
  '_setNetworkCallback',
  'emscriptenWebGLGet',
  'emscriptenWebGLGetUniform',
  'emscriptenWebGLGetVertexAttrib',
  '__glGetActiveAttribOrUniform',
  'writeGLArray',
  'registerWebGlEventCallback',
  'runAndAbortIfError',
  'writeStringToMemory',
  'writeAsciiToMemory',
  'allocateUTF8',
  'allocateUTF8OnStack',
  'demangle',
  'stackTrace',
  'getNativeTypeSize',
];
missingLibrarySymbols.forEach(missingLibrarySymbol)

  var unexportedSymbols = [
  'run',
  'out',
  'err',
  'callMain',
  'abort',
  'wasmExports',
  'writeStackCookie',
  'checkStackCookie',
  'INT53_MAX',
  'INT53_MIN',
  'bigintToI53Checked',
  'HEAP8',
  'HEAPU8',
  'HEAP16',
  'HEAPU16',
  'HEAP32',
  'HEAPU32',
  'HEAPF32',
  'HEAPF64',
  'HEAP64',
  'HEAPU64',
  'stackSave',
  'stackRestore',
  'stackAlloc',
  'setTempRet0',
  'ptrToString',
  'exitJS',
  'getHeapMax',
  'growMemory',
  'ENV',
  'ERRNO_CODES',
  'strError',
  'DNS',
  'Protocols',
  'timers',
  'warnOnce',
  'readEmAsmArgsArray',
  'jstoi_q',
  'getExecutableName',
  'handleException',
  'keepRuntimeAlive',
  'callUserCallback',
  'maybeExit',
  'asyncLoad',
  'alignMemory',
  'mmapAlloc',
  'wasmTable',
  'wasmMemory',
  'getUniqueRunDependency',
  'noExitRuntime',
  'addOnPreRun',
  'addOnPostRun',
  'freeTableIndexes',
  'functionsInTableMap',
  'PATH',
  'PATH_FS',
  'UTF8Decoder',
  'UTF8ArrayToString',
  'UTF8ToString',
  'stringToUTF8Array',
  'stringToUTF8',
  'lengthBytesUTF8',
  'intArrayFromString',
  'UTF16Decoder',
  'stringToUTF8OnStack',
  'writeArrayToMemory',
  'JSEvents',
  'specialHTMLTargets',
  'maybeCStringToJsString',
  'findEventTarget',
  'findCanvasEventTarget',
  'restoreOldWindowedStyle',
  'UNWIND_CACHE',
  'ExitStatus',
  'getEnvStrings',
  'doReadv',
  'doWritev',
  'initRandomFill',
  'randomFill',
  'emSetImmediate',
  'emClearImmediate',
  'promiseMap',
  'uncaughtExceptionCount',
  'exceptionLast',
  'exceptionCaught',
  'ExceptionInfo',
  'findMatchingCatch',
  'getExceptionMessageCommon',
  'incrementExceptionRefcount',
  'decrementExceptionRefcount',
  'getExceptionMessage',
  'Browser',
  'requestFullscreen',
  'setCanvasSize',
  'createContext',
  'wget',
  'MONTH_DAYS_REGULAR',
  'MONTH_DAYS_LEAP',
  'MONTH_DAYS_REGULAR_CUMULATIVE',
  'MONTH_DAYS_LEAP_CUMULATIVE',
  'SYSCALLS',
  'preloadPlugins',
  'FS_createPreloadedFile',
  'FS_modeStringToFlags',
  'FS_getMode',
  'FS_fileDataToTypedArray',
  'FS_stdin_getChar_buffer',
  'FS_stdin_getChar',
  'FS_readFile',
  'FS',
  'FS_root',
  'FS_mounts',
  'FS_devices',
  'FS_streams',
  'FS_nextInode',
  'FS_nameTable',
  'FS_currentPath',
  'FS_initialized',
  'FS_ignorePermissions',
  'FS_filesystems',
  'FS_syncFSRequests',
  'FS_lookupPath',
  'FS_getPath',
  'FS_hashName',
  'FS_hashAddNode',
  'FS_hashRemoveNode',
  'FS_lookupNode',
  'FS_createNode',
  'FS_destroyNode',
  'FS_isRoot',
  'FS_isMountpoint',
  'FS_isFile',
  'FS_isDir',
  'FS_isLink',
  'FS_isChrdev',
  'FS_isBlkdev',
  'FS_isFIFO',
  'FS_isSocket',
  'FS_flagsToPermissionString',
  'FS_nodePermissions',
  'FS_mayLookup',
  'FS_mayCreate',
  'FS_mayDelete',
  'FS_mayOpen',
  'FS_checkOpExists',
  'FS_nextfd',
  'FS_getStreamChecked',
  'FS_getStream',
  'FS_createStream',
  'FS_closeStream',
  'FS_dupStream',
  'FS_doSetAttr',
  'FS_chrdev_stream_ops',
  'FS_major',
  'FS_minor',
  'FS_makedev',
  'FS_registerDevice',
  'FS_getDevice',
  'FS_getMounts',
  'FS_syncfs',
  'FS_mount',
  'FS_unmount',
  'FS_lookup',
  'FS_mknod',
  'FS_statfs',
  'FS_statfsStream',
  'FS_statfsNode',
  'FS_create',
  'FS_mkdir',
  'FS_mkdev',
  'FS_symlink',
  'FS_link',
  'FS_rename',
  'FS_rmdir',
  'FS_readdir',
  'FS_readlink',
  'FS_stat',
  'FS_fstat',
  'FS_lstat',
  'FS_doChmod',
  'FS_chmod',
  'FS_lchmod',
  'FS_fchmod',
  'FS_doChown',
  'FS_chown',
  'FS_lchown',
  'FS_fchown',
  'FS_doTruncate',
  'FS_truncate',
  'FS_ftruncate',
  'FS_utime',
  'FS_open',
  'FS_close',
  'FS_isClosed',
  'FS_llseek',
  'FS_read',
  'FS_write',
  'FS_mmap',
  'FS_msync',
  'FS_ioctl',
  'FS_writeFile',
  'FS_cwd',
  'FS_chdir',
  'FS_createDefaultDirectories',
  'FS_createDefaultDevices',
  'FS_createSpecialDirectories',
  'FS_createStandardStreams',
  'FS_staticInit',
  'FS_init',
  'FS_quit',
  'FS_analyzePath',
  'FS_createFile',
  'FS_forceLoadFile',
  'MEMFS',
  'TTY',
  'PIPEFS',
  'SOCKFS',
  'tempFixedLengthArray',
  'miniTempWebGLFloatBuffers',
  'miniTempWebGLIntBuffers',
  'heapObjectForWebGLType',
  'toTypedArrayIndex',
  'webgl_enable_ANGLE_instanced_arrays',
  'webgl_enable_OES_vertex_array_object',
  'webgl_enable_WEBGL_draw_buffers',
  'webgl_enable_WEBGL_multi_draw',
  'webgl_enable_EXT_polygon_offset_clamp',
  'webgl_enable_EXT_clip_control',
  'webgl_enable_WEBGL_polygon_mode',
  'GL',
  'computeUnpackAlignedImageSize',
  'colorChannelsInGlTextureFormat',
  'emscriptenWebGLGetTexPixelData',
  'webglGetProgramUniformLocation',
  'webglGetUniformLocation',
  'webglPrepareUniformLocationsBeforeFirstUse',
  'webglGetLeftBracePos',
  'AL',
  'GLUT',
  'EGL',
  'GLEW',
  'IDBStore',
  'SDL',
  'SDL_gfx',
  'print',
  'printErr',
  'jstoi_s',
];
unexportedSymbols.forEach(unexportedRuntimeSymbol);

  // End runtime exports
  // Begin JS library exports
  // End JS library exports

// end include: postlibrary.js

function checkIncomingModuleAPI() {
  ignoredModuleProp('fetchSettings');
  ignoredModuleProp('logReadFiles');
  ignoredModuleProp('loadSplitModule');
  ignoredModuleProp('onMalloc');
  ignoredModuleProp('onRealloc');
  ignoredModuleProp('onFree');
  ignoredModuleProp('onSbrkGrow');
  ignoredModuleProp('onCOSCacheHit');
  ignoredModuleProp('onCOSCacheMiss');
  ignoredModuleProp('onCOSStore');
  ignoredModuleProp('GL_MAX_TEXTURE_IMAGE_UNITS');
  ignoredModuleProp('SDL_canPlayWithWebAudio');
  ignoredModuleProp('SDL_numSimultaneouslyQueuedBuffers');
  ignoredModuleProp('freePreloadedMediaOnUse');
  ignoredModuleProp('preinitializedWebGLContext');
  ignoredModuleProp('keyboardListeningElement');
  ignoredModuleProp('doNotCaptureKeyboard');
  ignoredModuleProp('extraStackTrace');
  ignoredModuleProp('preloadPlugins');
  ignoredModuleProp('preMainLoop');
  ignoredModuleProp('postMainLoop');
  ignoredModuleProp('forcedAspectRatio');
  ignoredModuleProp('mainScriptUrlOrBlob');
  ignoredModuleProp('onFullScreen');
  ignoredModuleProp('INITIAL_MEMORY');
  ignoredModuleProp('wasmMemory');
  ignoredModuleProp('wasmBinary');
}

// Imports from the Wasm binary.
var _inventory_reset = Module['_inventory_reset'] = makeInvalidEarlyAccess('_inventory_reset');
var _inventory_field = Module['_inventory_field'] = makeInvalidEarlyAccess('_inventory_field');
var _inventory_empty = Module['_inventory_empty'] = makeInvalidEarlyAccess('_inventory_empty');
var _inventory_add_typed = Module['_inventory_add_typed'] = makeInvalidEarlyAccess('_inventory_add_typed');
var _inventory_add = Module['_inventory_add'] = makeInvalidEarlyAccess('_inventory_add');
var _inventory_equip = Module['_inventory_equip'] = makeInvalidEarlyAccess('_inventory_equip');
var _inventory_unequip = Module['_inventory_unequip'] = makeInvalidEarlyAccess('_inventory_unequip');
var _inventory_equipped = Module['_inventory_equipped'] = makeInvalidEarlyAccess('_inventory_equipped');
var _inventory_primary = Module['_inventory_primary'] = makeInvalidEarlyAccess('_inventory_primary');
var _inventory_item_slot = Module['_inventory_item_slot'] = makeInvalidEarlyAccess('_inventory_item_slot');
var _inventory_item_class = Module['_inventory_item_class'] = makeInvalidEarlyAccess('_inventory_item_class');
var _inventory_move = Module['_inventory_move'] = makeInvalidEarlyAccess('_inventory_move');
var _inventory_item_x = Module['_inventory_item_x'] = makeInvalidEarlyAccess('_inventory_item_x');
var _inventory_item_y = Module['_inventory_item_y'] = makeInvalidEarlyAccess('_inventory_item_y');
var _inventory_free_fields = Module['_inventory_free_fields'] = makeInvalidEarlyAccess('_inventory_free_fields');
var _inventory_slot_error = Module['_inventory_slot_error'] = makeInvalidEarlyAccess('_inventory_slot_error');
var _inventory_item_equip_slot = Module['_inventory_item_equip_slot'] = makeInvalidEarlyAccess('_inventory_item_equip_slot');
var _inventory_item_gender = Module['_inventory_item_gender'] = makeInvalidEarlyAccess('_inventory_item_gender');
var _armor_model_count = Module['_armor_model_count'] = makeInvalidEarlyAccess('_armor_model_count');
var _armor_model_blueprint = Module['_armor_model_blueprint'] = makeInvalidEarlyAccess('_armor_model_blueprint');
var _armor_model_additions = Module['_armor_model_additions'] = makeInvalidEarlyAccess('_armor_model_additions');
var _armor_model_deletions = Module['_armor_model_deletions'] = makeInvalidEarlyAccess('_armor_model_deletions');
var _combat_brain_enable = Module['_combat_brain_enable'] = makeInvalidEarlyAccess('_combat_brain_enable');
var _combat_monster_attacks = Module['_combat_monster_attacks'] = makeInvalidEarlyAccess('_combat_monster_attacks');
var _combat_brain_target = Module['_combat_brain_target'] = makeInvalidEarlyAccess('_combat_brain_target');
var _combat_monster_busy = Module['_combat_monster_busy'] = makeInvalidEarlyAccess('_combat_monster_busy');
var _combat_monster_movement = Module['_combat_monster_movement'] = makeInvalidEarlyAccess('_combat_monster_movement');
var _combat_monster_action = Module['_combat_monster_action'] = makeInvalidEarlyAccess('_combat_monster_action');
var _combat_monster_position = Module['_combat_monster_position'] = makeInvalidEarlyAccess('_combat_monster_position');
var _combat_monster_yaw = Module['_combat_monster_yaw'] = makeInvalidEarlyAccess('_combat_monster_yaw');
var _combat_last_victim_id = Module['_combat_last_victim_id'] = makeInvalidEarlyAccess('_combat_last_victim_id');
var _combat_last_attacker_id = Module['_combat_last_attacker_id'] = makeInvalidEarlyAccess('_combat_last_attacker_id');
var _combat_test_player_death = Module['_combat_test_player_death'] = makeInvalidEarlyAccess('_combat_test_player_death');
var _combat_player_dead = Module['_combat_player_dead'] = makeInvalidEarlyAccess('_combat_player_dead');
var _combat_player_hp = Module['_combat_player_hp'] = makeInvalidEarlyAccess('_combat_player_hp');
var _combat_player_max_hp = Module['_combat_player_max_hp'] = makeInvalidEarlyAccess('_combat_player_max_hp');
var _combat_player_teleports = Module['_combat_player_teleports'] = makeInvalidEarlyAccess('_combat_player_teleports');
var _combat_player_death_phase = Module['_combat_player_death_phase'] = makeInvalidEarlyAccess('_combat_player_death_phase');
var _combat_player_position = Module['_combat_player_position'] = makeInvalidEarlyAccess('_combat_player_position');
var _combat_test_bad_span = Module['_combat_test_bad_span'] = makeInvalidEarlyAccess('_combat_test_bad_span');
var _combat_attack_raw = Module['_combat_attack_raw'] = makeInvalidEarlyAccess('_combat_attack_raw');
var _combat_test_reset = Module['_combat_test_reset'] = makeInvalidEarlyAccess('_combat_test_reset');
var _combat_test_positions = Module['_combat_test_positions'] = makeInvalidEarlyAccess('_combat_test_positions');
var _combat_test_tick = Module['_combat_test_tick'] = makeInvalidEarlyAccess('_combat_test_tick');
var _combat_free_xp = Module['_combat_free_xp'] = makeInvalidEarlyAccess('_combat_free_xp');
var _combat_max_hp = Module['_combat_max_hp'] = makeInvalidEarlyAccess('_combat_max_hp');
var _combat_last_kill_xp = Module['_combat_last_kill_xp'] = makeInvalidEarlyAccess('_combat_last_kill_xp');
var _combat_hp = Module['_combat_hp'] = makeInvalidEarlyAccess('_combat_hp');
var _combat_xp = Module['_combat_xp'] = makeInvalidEarlyAccess('_combat_xp');
var _combat_dead = Module['_combat_dead'] = makeInvalidEarlyAccess('_combat_dead');
var _combat_corpse = Module['_combat_corpse'] = makeInvalidEarlyAccess('_combat_corpse');
var _combat_busy = Module['_combat_busy'] = makeInvalidEarlyAccess('_combat_busy');
var _combat_last_event = Module['_combat_last_event'] = makeInvalidEarlyAccess('_combat_last_event');
var _combat_last_error = Module['_combat_last_error'] = makeInvalidEarlyAccess('_combat_last_error');
var _combat_damage = Module['_combat_damage'] = makeInvalidEarlyAccess('_combat_damage');
var _combat_hit_count = Module['_combat_hit_count'] = makeInvalidEarlyAccess('_combat_hit_count');
var _combat_evade_count = Module['_combat_evade_count'] = makeInvalidEarlyAccess('_combat_evade_count');
var _combat_kill_count = Module['_combat_kill_count'] = makeInvalidEarlyAccess('_combat_kill_count');
var _combat_test_roll = Module['_combat_test_roll'] = makeInvalidEarlyAccess('_combat_test_roll');
var _stats_active = Module['_stats_active'] = makeInvalidEarlyAccess('_stats_active');
var _stats_load_profile = Module['_stats_load_profile'] = makeInvalidEarlyAccess('_stats_load_profile');
var _scene_reset = Module['_scene_reset'] = makeInvalidEarlyAccess('_scene_reset');
var _stats_test_baseline = Module['_stats_test_baseline'] = makeInvalidEarlyAccess('_stats_test_baseline');
var _stats_value = Module['_stats_value'] = makeInvalidEarlyAccess('_stats_value');
var _stats_raise = Module['_stats_raise'] = makeInvalidEarlyAccess('_stats_raise');
var _stats_notification_count = Module['_stats_notification_count'] = makeInvalidEarlyAccess('_stats_notification_count');
var _stats_level = Module['_stats_level'] = makeInvalidEarlyAccess('_stats_level');
var _character_name = Module['_character_name'] = makeInvalidEarlyAccess('_character_name');
var _character_limit = Module['_character_limit'] = makeInvalidEarlyAccess('_character_limit');
var _character_check = Module['_character_check'] = makeInvalidEarlyAccess('_character_check');
var _character_create_gender = Module['_character_create_gender'] = makeInvalidEarlyAccess('_character_create_gender');
var _character_get_gender = Module['_character_get_gender'] = makeInvalidEarlyAccess('_character_get_gender');
var _character_create = Module['_character_create'] = makeInvalidEarlyAccess('_character_create');
var _character_can_save = Module['_character_can_save'] = makeInvalidEarlyAccess('_character_can_save');
var _character_state_json = Module['_character_state_json'] = makeInvalidEarlyAccess('_character_state_json');
var _character_import = Module['_character_import'] = makeInvalidEarlyAccess('_character_import');
var _scene_player_killed = Module['_scene_player_killed'] = makeInvalidEarlyAccess('_scene_player_killed');
var _hud_bar_rect = Module['_hud_bar_rect'] = makeInvalidEarlyAccess('_hud_bar_rect');
var _hud_vital_value = Module['_hud_vital_value'] = makeInvalidEarlyAccess('_hud_vital_value');
var _hud_round = Module['_hud_round'] = makeInvalidEarlyAccess('_hud_round');
var _inventory_ui_item_rect = Module['_inventory_ui_item_rect'] = makeInvalidEarlyAccess('_inventory_ui_item_rect');
var _inventory_ui_slot_rect = Module['_inventory_ui_slot_rect'] = makeInvalidEarlyAccess('_inventory_ui_slot_rect');
var _inventory_ui_hit = Module['_inventory_ui_hit'] = makeInvalidEarlyAccess('_inventory_ui_hit');
var _scene_material_count = Module['_scene_material_count'] = makeInvalidEarlyAccess('_scene_material_count');
var _scene_lighting = Module['_scene_lighting'] = makeInvalidEarlyAccess('_scene_lighting');
var _scene_material_probe = Module['_scene_material_probe'] = makeInvalidEarlyAccess('_scene_material_probe');
var _scene_terrain_material_probe = Module['_scene_terrain_material_probe'] = makeInvalidEarlyAccess('_scene_terrain_material_probe');
var _core_sky_draw_count = Module['_core_sky_draw_count'] = makeInvalidEarlyAccess('_core_sky_draw_count');
var _core_sky_vertex_count = Module['_core_sky_vertex_count'] = makeInvalidEarlyAccess('_core_sky_vertex_count');
var _core_sky_vertex = Module['_core_sky_vertex'] = makeInvalidEarlyAccess('_core_sky_vertex');
var _core_sky_cloud_phase = Module['_core_sky_cloud_phase'] = makeInvalidEarlyAccess('_core_sky_cloud_phase');
var _core_sky_diagnostic_clock = Module['_core_sky_diagnostic_clock'] = makeInvalidEarlyAccess('_core_sky_diagnostic_clock');
var _population_is_active = Module['_population_is_active'] = makeInvalidEarlyAccess('_population_is_active');
var _population_count = Module['_population_count'] = makeInvalidEarlyAccess('_population_count');
var _population_id = Module['_population_id'] = makeInvalidEarlyAccess('_population_id');
var _population_position = Module['_population_position'] = makeInvalidEarlyAccess('_population_position');
var _population_generator_count = Module['_population_generator_count'] = makeInvalidEarlyAccess('_population_generator_count');
var _population_blueprint = Module['_population_blueprint'] = makeInvalidEarlyAccess('_population_blueprint');
var _population_name = Module['_population_name'] = makeInvalidEarlyAccess('_population_name');
var _population_speed = Module['_population_speed'] = makeInvalidEarlyAccess('_population_speed');
var _population_brain_target = Module['_population_brain_target'] = makeInvalidEarlyAccess('_population_brain_target');
var _population_dead = Module['_population_dead'] = makeInvalidEarlyAccess('_population_dead');
var _population_hp = Module['_population_hp'] = makeInvalidEarlyAccess('_population_hp');
var _population_target = Module['_population_target'] = makeInvalidEarlyAccess('_population_target');
var _population_select = Module['_population_select'] = makeInvalidEarlyAccess('_population_select');
var _population_test_remove = Module['_population_test_remove'] = makeInvalidEarlyAccess('_population_test_remove');
var _loot_available = Module['_loot_available'] = makeInvalidEarlyAccess('_loot_available');
var _loot_target = Module['_loot_target'] = makeInvalidEarlyAccess('_loot_target');
var _loot_selected = Module['_loot_selected'] = makeInvalidEarlyAccess('_loot_selected');
var _loot_generated = Module['_loot_generated'] = makeInvalidEarlyAccess('_loot_generated');
var _loot_placed = Module['_loot_placed'] = makeInvalidEarlyAccess('_loot_placed');
var _loot_discarded = Module['_loot_discarded'] = makeInvalidEarlyAccess('_loot_discarded');
var _loot_temporary_count = Module['_loot_temporary_count'] = makeInvalidEarlyAccess('_loot_temporary_count');
var _inventory_items_json = Module['_inventory_items_json'] = makeInvalidEarlyAccess('_inventory_items_json');
var _loot_test_random = Module['_loot_test_random'] = makeInvalidEarlyAccess('_loot_test_random');
var _loot_test_pick = Module['_loot_test_pick'] = makeInvalidEarlyAccess('_loot_test_pick');
var _inventory_add_source_item = Module['_inventory_add_source_item'] = makeInvalidEarlyAccess('_inventory_add_source_item');
var _inventory_item_subclass = Module['_inventory_item_subclass'] = makeInvalidEarlyAccess('_inventory_item_subclass');
var _inventory_item_variant = Module['_inventory_item_variant'] = makeInvalidEarlyAccess('_inventory_item_variant');
var _inventory_item_can_equip = Module['_inventory_item_can_equip'] = makeInvalidEarlyAccess('_inventory_item_can_equip');
var _scene_controller_version = Module['_scene_controller_version'] = makeInvalidEarlyAccess('_scene_controller_version');
var _scene_movement_mode = Module['_scene_movement_mode'] = makeInvalidEarlyAccess('_scene_movement_mode');
var _scene_input = Module['_scene_input'] = makeInvalidEarlyAccess('_scene_input');
var _scene_pause = Module['_scene_pause'] = makeInvalidEarlyAccess('_scene_pause');
var _scene_step = Module['_scene_step'] = makeInvalidEarlyAccess('_scene_step');
var _scene_population_visit = Module['_scene_population_visit'] = makeInvalidEarlyAccess('_scene_population_visit');
var _scene_enemy_checksum = Module['_scene_enemy_checksum'] = makeInvalidEarlyAccess('_scene_enemy_checksum');
var _scene_attack = Module['_scene_attack'] = makeInvalidEarlyAccess('_scene_attack');
var _scene_enemy_position = Module['_scene_enemy_position'] = makeInvalidEarlyAccess('_scene_enemy_position');
var _scene_death = Module['_scene_death'] = makeInvalidEarlyAccess('_scene_death');
var _scene_add_automag = Module['_scene_add_automag'] = makeInvalidEarlyAccess('_scene_add_automag');
var _scene_weapon_visible = Module['_scene_weapon_visible'] = makeInvalidEarlyAccess('_scene_weapon_visible');
var _scene_animation_name = Module['_scene_animation_name'] = makeInvalidEarlyAccess('_scene_animation_name');
var _scene_animation_duration = Module['_scene_animation_duration'] = makeInvalidEarlyAccess('_scene_animation_duration');
var _scene_weapon_vertex_count = Module['_scene_weapon_vertex_count'] = makeInvalidEarlyAccess('_scene_weapon_vertex_count');
var _scene_weapon_checksum = Module['_scene_weapon_checksum'] = makeInvalidEarlyAccess('_scene_weapon_checksum');
var _scene_weapon_vertex = Module['_scene_weapon_vertex'] = makeInvalidEarlyAccess('_scene_weapon_vertex');
var _scene_armor_vertex_count = Module['_scene_armor_vertex_count'] = makeInvalidEarlyAccess('_scene_armor_vertex_count');
var _scene_armor_vertex = Module['_scene_armor_vertex'] = makeInvalidEarlyAccess('_scene_armor_vertex');
var _scene_sky_view = Module['_scene_sky_view'] = makeInvalidEarlyAccess('_scene_sky_view');
var _scene_orbit = Module['_scene_orbit'] = makeInvalidEarlyAccess('_scene_orbit');
var _scene_position = Module['_scene_position'] = makeInvalidEarlyAccess('_scene_position');
var _scene_yaw = Module['_scene_yaw'] = makeInvalidEarlyAccess('_scene_yaw');
var _scene_mode = Module['_scene_mode'] = makeInvalidEarlyAccess('_scene_mode');
var _frame_count = Module['_frame_count'] = makeInvalidEarlyAccess('_frame_count');
var _scene_height = Module['_scene_height'] = makeInvalidEarlyAccess('_scene_height');
var _scene_actor_vertex_count = Module['_scene_actor_vertex_count'] = makeInvalidEarlyAccess('_scene_actor_vertex_count');
var _scene_actor_vertex = Module['_scene_actor_vertex'] = makeInvalidEarlyAccess('_scene_actor_vertex');
var _scene_actor_direction = Module['_scene_actor_direction'] = makeInvalidEarlyAccess('_scene_actor_direction');
var _vertex_checksum = Module['_vertex_checksum'] = makeInvalidEarlyAccess('_vertex_checksum');
var _scene_surface_height = Module['_scene_surface_height'] = makeInvalidEarlyAccess('_scene_surface_height');
var _scene_test_world_position = Module['_scene_test_world_position'] = makeInvalidEarlyAccess('_scene_test_world_position');
var _scene_scenery_count = Module['_scene_scenery_count'] = makeInvalidEarlyAccess('_scene_scenery_count');
var _scene_scenery_visible = Module['_scene_scenery_visible'] = makeInvalidEarlyAccess('_scene_scenery_visible');
var _scene_scenery_matrix = Module['_scene_scenery_matrix'] = makeInvalidEarlyAccess('_scene_scenery_matrix');
var _scene_scenery_model = Module['_scene_scenery_model'] = makeInvalidEarlyAccess('_scene_scenery_model');
var _scene_visit_site = Module['_scene_visit_site'] = makeInvalidEarlyAccess('_scene_visit_site');
var _population_mesh_vertices = Module['_population_mesh_vertices'] = makeInvalidEarlyAccess('_population_mesh_vertices');
var _population_mesh_checksum = Module['_population_mesh_checksum'] = makeInvalidEarlyAccess('_population_mesh_checksum');
var _population_animation_name = Module['_population_animation_name'] = makeInvalidEarlyAccess('_population_animation_name');
var _population_animation_duration = Module['_population_animation_duration'] = makeInvalidEarlyAccess('_population_animation_duration');
var _population_marker_draws = Module['_population_marker_draws'] = makeInvalidEarlyAccess('_population_marker_draws');
var _main = Module['_main'] = makeInvalidEarlyAccess('_main');
var _fflush = makeInvalidEarlyAccess('_fflush');
var _emscripten_stack_get_end = makeInvalidEarlyAccess('_emscripten_stack_get_end');
var _emscripten_stack_get_base = makeInvalidEarlyAccess('_emscripten_stack_get_base');
var _strerror = makeInvalidEarlyAccess('_strerror');
var _malloc = makeInvalidEarlyAccess('_malloc');
var _free = makeInvalidEarlyAccess('_free');
var _setThrew = makeInvalidEarlyAccess('_setThrew');
var __emscripten_tempret_set = makeInvalidEarlyAccess('__emscripten_tempret_set');
var _emscripten_stack_init = makeInvalidEarlyAccess('_emscripten_stack_init');
var _emscripten_stack_get_free = makeInvalidEarlyAccess('_emscripten_stack_get_free');
var __emscripten_stack_restore = makeInvalidEarlyAccess('__emscripten_stack_restore');
var __emscripten_stack_alloc = makeInvalidEarlyAccess('__emscripten_stack_alloc');
var _emscripten_stack_get_current = makeInvalidEarlyAccess('_emscripten_stack_get_current');
var ___cxa_decrement_exception_refcount = makeInvalidEarlyAccess('___cxa_decrement_exception_refcount');
var ___cxa_increment_exception_refcount = makeInvalidEarlyAccess('___cxa_increment_exception_refcount');
var ___get_exception_message = makeInvalidEarlyAccess('___get_exception_message');
var ___cxa_can_catch = makeInvalidEarlyAccess('___cxa_can_catch');
var ___cxa_get_exception_ptr = makeInvalidEarlyAccess('___cxa_get_exception_ptr');
var memory = makeInvalidEarlyAccess('memory');
var __indirect_function_table = makeInvalidEarlyAccess('__indirect_function_table');
var wasmMemory = makeInvalidEarlyAccess('wasmMemory');
var wasmTable = makeInvalidEarlyAccess('wasmTable');

function assignWasmExports(wasmExports) {
  assert(typeof wasmExports['inventory_reset'] != 'undefined', 'missing Wasm export: inventory_reset');
  assert(typeof wasmExports['inventory_field'] != 'undefined', 'missing Wasm export: inventory_field');
  assert(typeof wasmExports['inventory_empty'] != 'undefined', 'missing Wasm export: inventory_empty');
  assert(typeof wasmExports['inventory_add_typed'] != 'undefined', 'missing Wasm export: inventory_add_typed');
  assert(typeof wasmExports['inventory_add'] != 'undefined', 'missing Wasm export: inventory_add');
  assert(typeof wasmExports['inventory_equip'] != 'undefined', 'missing Wasm export: inventory_equip');
  assert(typeof wasmExports['inventory_unequip'] != 'undefined', 'missing Wasm export: inventory_unequip');
  assert(typeof wasmExports['inventory_equipped'] != 'undefined', 'missing Wasm export: inventory_equipped');
  assert(typeof wasmExports['inventory_primary'] != 'undefined', 'missing Wasm export: inventory_primary');
  assert(typeof wasmExports['inventory_item_slot'] != 'undefined', 'missing Wasm export: inventory_item_slot');
  assert(typeof wasmExports['inventory_item_class'] != 'undefined', 'missing Wasm export: inventory_item_class');
  assert(typeof wasmExports['inventory_move'] != 'undefined', 'missing Wasm export: inventory_move');
  assert(typeof wasmExports['inventory_item_x'] != 'undefined', 'missing Wasm export: inventory_item_x');
  assert(typeof wasmExports['inventory_item_y'] != 'undefined', 'missing Wasm export: inventory_item_y');
  assert(typeof wasmExports['inventory_free_fields'] != 'undefined', 'missing Wasm export: inventory_free_fields');
  assert(typeof wasmExports['inventory_slot_error'] != 'undefined', 'missing Wasm export: inventory_slot_error');
  assert(typeof wasmExports['inventory_item_equip_slot'] != 'undefined', 'missing Wasm export: inventory_item_equip_slot');
  assert(typeof wasmExports['inventory_item_gender'] != 'undefined', 'missing Wasm export: inventory_item_gender');
  assert(typeof wasmExports['armor_model_count'] != 'undefined', 'missing Wasm export: armor_model_count');
  assert(typeof wasmExports['armor_model_blueprint'] != 'undefined', 'missing Wasm export: armor_model_blueprint');
  assert(typeof wasmExports['armor_model_additions'] != 'undefined', 'missing Wasm export: armor_model_additions');
  assert(typeof wasmExports['armor_model_deletions'] != 'undefined', 'missing Wasm export: armor_model_deletions');
  assert(typeof wasmExports['combat_brain_enable'] != 'undefined', 'missing Wasm export: combat_brain_enable');
  assert(typeof wasmExports['combat_monster_attacks'] != 'undefined', 'missing Wasm export: combat_monster_attacks');
  assert(typeof wasmExports['combat_brain_target'] != 'undefined', 'missing Wasm export: combat_brain_target');
  assert(typeof wasmExports['combat_monster_busy'] != 'undefined', 'missing Wasm export: combat_monster_busy');
  assert(typeof wasmExports['combat_monster_movement'] != 'undefined', 'missing Wasm export: combat_monster_movement');
  assert(typeof wasmExports['combat_monster_action'] != 'undefined', 'missing Wasm export: combat_monster_action');
  assert(typeof wasmExports['combat_monster_position'] != 'undefined', 'missing Wasm export: combat_monster_position');
  assert(typeof wasmExports['combat_monster_yaw'] != 'undefined', 'missing Wasm export: combat_monster_yaw');
  assert(typeof wasmExports['combat_last_victim_id'] != 'undefined', 'missing Wasm export: combat_last_victim_id');
  assert(typeof wasmExports['combat_last_attacker_id'] != 'undefined', 'missing Wasm export: combat_last_attacker_id');
  assert(typeof wasmExports['combat_test_player_death'] != 'undefined', 'missing Wasm export: combat_test_player_death');
  assert(typeof wasmExports['combat_player_dead'] != 'undefined', 'missing Wasm export: combat_player_dead');
  assert(typeof wasmExports['combat_player_hp'] != 'undefined', 'missing Wasm export: combat_player_hp');
  assert(typeof wasmExports['combat_player_max_hp'] != 'undefined', 'missing Wasm export: combat_player_max_hp');
  assert(typeof wasmExports['combat_player_teleports'] != 'undefined', 'missing Wasm export: combat_player_teleports');
  assert(typeof wasmExports['combat_player_death_phase'] != 'undefined', 'missing Wasm export: combat_player_death_phase');
  assert(typeof wasmExports['combat_player_position'] != 'undefined', 'missing Wasm export: combat_player_position');
  assert(typeof wasmExports['combat_test_bad_span'] != 'undefined', 'missing Wasm export: combat_test_bad_span');
  assert(typeof wasmExports['combat_attack_raw'] != 'undefined', 'missing Wasm export: combat_attack_raw');
  assert(typeof wasmExports['combat_test_reset'] != 'undefined', 'missing Wasm export: combat_test_reset');
  assert(typeof wasmExports['combat_test_positions'] != 'undefined', 'missing Wasm export: combat_test_positions');
  assert(typeof wasmExports['combat_test_tick'] != 'undefined', 'missing Wasm export: combat_test_tick');
  assert(typeof wasmExports['combat_free_xp'] != 'undefined', 'missing Wasm export: combat_free_xp');
  assert(typeof wasmExports['combat_max_hp'] != 'undefined', 'missing Wasm export: combat_max_hp');
  assert(typeof wasmExports['combat_last_kill_xp'] != 'undefined', 'missing Wasm export: combat_last_kill_xp');
  assert(typeof wasmExports['combat_hp'] != 'undefined', 'missing Wasm export: combat_hp');
  assert(typeof wasmExports['combat_xp'] != 'undefined', 'missing Wasm export: combat_xp');
  assert(typeof wasmExports['combat_dead'] != 'undefined', 'missing Wasm export: combat_dead');
  assert(typeof wasmExports['combat_corpse'] != 'undefined', 'missing Wasm export: combat_corpse');
  assert(typeof wasmExports['combat_busy'] != 'undefined', 'missing Wasm export: combat_busy');
  assert(typeof wasmExports['combat_last_event'] != 'undefined', 'missing Wasm export: combat_last_event');
  assert(typeof wasmExports['combat_last_error'] != 'undefined', 'missing Wasm export: combat_last_error');
  assert(typeof wasmExports['combat_damage'] != 'undefined', 'missing Wasm export: combat_damage');
  assert(typeof wasmExports['combat_hit_count'] != 'undefined', 'missing Wasm export: combat_hit_count');
  assert(typeof wasmExports['combat_evade_count'] != 'undefined', 'missing Wasm export: combat_evade_count');
  assert(typeof wasmExports['combat_kill_count'] != 'undefined', 'missing Wasm export: combat_kill_count');
  assert(typeof wasmExports['combat_test_roll'] != 'undefined', 'missing Wasm export: combat_test_roll');
  assert(typeof wasmExports['stats_active'] != 'undefined', 'missing Wasm export: stats_active');
  assert(typeof wasmExports['stats_load_profile'] != 'undefined', 'missing Wasm export: stats_load_profile');
  assert(typeof wasmExports['scene_reset'] != 'undefined', 'missing Wasm export: scene_reset');
  assert(typeof wasmExports['stats_test_baseline'] != 'undefined', 'missing Wasm export: stats_test_baseline');
  assert(typeof wasmExports['stats_value'] != 'undefined', 'missing Wasm export: stats_value');
  assert(typeof wasmExports['stats_raise'] != 'undefined', 'missing Wasm export: stats_raise');
  assert(typeof wasmExports['stats_notification_count'] != 'undefined', 'missing Wasm export: stats_notification_count');
  assert(typeof wasmExports['stats_level'] != 'undefined', 'missing Wasm export: stats_level');
  assert(typeof wasmExports['character_name'] != 'undefined', 'missing Wasm export: character_name');
  assert(typeof wasmExports['character_limit'] != 'undefined', 'missing Wasm export: character_limit');
  assert(typeof wasmExports['character_check'] != 'undefined', 'missing Wasm export: character_check');
  assert(typeof wasmExports['character_create_gender'] != 'undefined', 'missing Wasm export: character_create_gender');
  assert(typeof wasmExports['character_get_gender'] != 'undefined', 'missing Wasm export: character_get_gender');
  assert(typeof wasmExports['character_create'] != 'undefined', 'missing Wasm export: character_create');
  assert(typeof wasmExports['character_can_save'] != 'undefined', 'missing Wasm export: character_can_save');
  assert(typeof wasmExports['character_state_json'] != 'undefined', 'missing Wasm export: character_state_json');
  assert(typeof wasmExports['character_import'] != 'undefined', 'missing Wasm export: character_import');
  assert(typeof wasmExports['scene_player_killed'] != 'undefined', 'missing Wasm export: scene_player_killed');
  assert(typeof wasmExports['hud_bar_rect'] != 'undefined', 'missing Wasm export: hud_bar_rect');
  assert(typeof wasmExports['hud_vital_value'] != 'undefined', 'missing Wasm export: hud_vital_value');
  assert(typeof wasmExports['hud_round'] != 'undefined', 'missing Wasm export: hud_round');
  assert(typeof wasmExports['inventory_ui_item_rect'] != 'undefined', 'missing Wasm export: inventory_ui_item_rect');
  assert(typeof wasmExports['inventory_ui_slot_rect'] != 'undefined', 'missing Wasm export: inventory_ui_slot_rect');
  assert(typeof wasmExports['inventory_ui_hit'] != 'undefined', 'missing Wasm export: inventory_ui_hit');
  assert(typeof wasmExports['scene_material_count'] != 'undefined', 'missing Wasm export: scene_material_count');
  assert(typeof wasmExports['scene_lighting'] != 'undefined', 'missing Wasm export: scene_lighting');
  assert(typeof wasmExports['scene_material_probe'] != 'undefined', 'missing Wasm export: scene_material_probe');
  assert(typeof wasmExports['scene_terrain_material_probe'] != 'undefined', 'missing Wasm export: scene_terrain_material_probe');
  assert(typeof wasmExports['core_sky_draw_count'] != 'undefined', 'missing Wasm export: core_sky_draw_count');
  assert(typeof wasmExports['core_sky_vertex_count'] != 'undefined', 'missing Wasm export: core_sky_vertex_count');
  assert(typeof wasmExports['core_sky_vertex'] != 'undefined', 'missing Wasm export: core_sky_vertex');
  assert(typeof wasmExports['core_sky_cloud_phase'] != 'undefined', 'missing Wasm export: core_sky_cloud_phase');
  assert(typeof wasmExports['core_sky_diagnostic_clock'] != 'undefined', 'missing Wasm export: core_sky_diagnostic_clock');
  assert(typeof wasmExports['population_is_active'] != 'undefined', 'missing Wasm export: population_is_active');
  assert(typeof wasmExports['population_count'] != 'undefined', 'missing Wasm export: population_count');
  assert(typeof wasmExports['population_id'] != 'undefined', 'missing Wasm export: population_id');
  assert(typeof wasmExports['population_position'] != 'undefined', 'missing Wasm export: population_position');
  assert(typeof wasmExports['population_generator_count'] != 'undefined', 'missing Wasm export: population_generator_count');
  assert(typeof wasmExports['population_blueprint'] != 'undefined', 'missing Wasm export: population_blueprint');
  assert(typeof wasmExports['population_name'] != 'undefined', 'missing Wasm export: population_name');
  assert(typeof wasmExports['population_speed'] != 'undefined', 'missing Wasm export: population_speed');
  assert(typeof wasmExports['population_brain_target'] != 'undefined', 'missing Wasm export: population_brain_target');
  assert(typeof wasmExports['population_dead'] != 'undefined', 'missing Wasm export: population_dead');
  assert(typeof wasmExports['population_hp'] != 'undefined', 'missing Wasm export: population_hp');
  assert(typeof wasmExports['population_target'] != 'undefined', 'missing Wasm export: population_target');
  assert(typeof wasmExports['population_select'] != 'undefined', 'missing Wasm export: population_select');
  assert(typeof wasmExports['population_test_remove'] != 'undefined', 'missing Wasm export: population_test_remove');
  assert(typeof wasmExports['loot_available'] != 'undefined', 'missing Wasm export: loot_available');
  assert(typeof wasmExports['loot_target'] != 'undefined', 'missing Wasm export: loot_target');
  assert(typeof wasmExports['loot_selected'] != 'undefined', 'missing Wasm export: loot_selected');
  assert(typeof wasmExports['loot_generated'] != 'undefined', 'missing Wasm export: loot_generated');
  assert(typeof wasmExports['loot_placed'] != 'undefined', 'missing Wasm export: loot_placed');
  assert(typeof wasmExports['loot_discarded'] != 'undefined', 'missing Wasm export: loot_discarded');
  assert(typeof wasmExports['loot_temporary_count'] != 'undefined', 'missing Wasm export: loot_temporary_count');
  assert(typeof wasmExports['inventory_items_json'] != 'undefined', 'missing Wasm export: inventory_items_json');
  assert(typeof wasmExports['loot_test_random'] != 'undefined', 'missing Wasm export: loot_test_random');
  assert(typeof wasmExports['loot_test_pick'] != 'undefined', 'missing Wasm export: loot_test_pick');
  assert(typeof wasmExports['inventory_add_source_item'] != 'undefined', 'missing Wasm export: inventory_add_source_item');
  assert(typeof wasmExports['inventory_item_subclass'] != 'undefined', 'missing Wasm export: inventory_item_subclass');
  assert(typeof wasmExports['inventory_item_variant'] != 'undefined', 'missing Wasm export: inventory_item_variant');
  assert(typeof wasmExports['inventory_item_can_equip'] != 'undefined', 'missing Wasm export: inventory_item_can_equip');
  assert(typeof wasmExports['scene_controller_version'] != 'undefined', 'missing Wasm export: scene_controller_version');
  assert(typeof wasmExports['scene_movement_mode'] != 'undefined', 'missing Wasm export: scene_movement_mode');
  assert(typeof wasmExports['scene_input'] != 'undefined', 'missing Wasm export: scene_input');
  assert(typeof wasmExports['scene_pause'] != 'undefined', 'missing Wasm export: scene_pause');
  assert(typeof wasmExports['scene_step'] != 'undefined', 'missing Wasm export: scene_step');
  assert(typeof wasmExports['scene_population_visit'] != 'undefined', 'missing Wasm export: scene_population_visit');
  assert(typeof wasmExports['scene_enemy_checksum'] != 'undefined', 'missing Wasm export: scene_enemy_checksum');
  assert(typeof wasmExports['scene_attack'] != 'undefined', 'missing Wasm export: scene_attack');
  assert(typeof wasmExports['scene_enemy_position'] != 'undefined', 'missing Wasm export: scene_enemy_position');
  assert(typeof wasmExports['scene_death'] != 'undefined', 'missing Wasm export: scene_death');
  assert(typeof wasmExports['scene_add_automag'] != 'undefined', 'missing Wasm export: scene_add_automag');
  assert(typeof wasmExports['scene_weapon_visible'] != 'undefined', 'missing Wasm export: scene_weapon_visible');
  assert(typeof wasmExports['scene_animation_name'] != 'undefined', 'missing Wasm export: scene_animation_name');
  assert(typeof wasmExports['scene_animation_duration'] != 'undefined', 'missing Wasm export: scene_animation_duration');
  assert(typeof wasmExports['scene_weapon_vertex_count'] != 'undefined', 'missing Wasm export: scene_weapon_vertex_count');
  assert(typeof wasmExports['scene_weapon_checksum'] != 'undefined', 'missing Wasm export: scene_weapon_checksum');
  assert(typeof wasmExports['scene_weapon_vertex'] != 'undefined', 'missing Wasm export: scene_weapon_vertex');
  assert(typeof wasmExports['scene_armor_vertex_count'] != 'undefined', 'missing Wasm export: scene_armor_vertex_count');
  assert(typeof wasmExports['scene_armor_vertex'] != 'undefined', 'missing Wasm export: scene_armor_vertex');
  assert(typeof wasmExports['scene_sky_view'] != 'undefined', 'missing Wasm export: scene_sky_view');
  assert(typeof wasmExports['scene_orbit'] != 'undefined', 'missing Wasm export: scene_orbit');
  assert(typeof wasmExports['scene_position'] != 'undefined', 'missing Wasm export: scene_position');
  assert(typeof wasmExports['scene_yaw'] != 'undefined', 'missing Wasm export: scene_yaw');
  assert(typeof wasmExports['scene_mode'] != 'undefined', 'missing Wasm export: scene_mode');
  assert(typeof wasmExports['frame_count'] != 'undefined', 'missing Wasm export: frame_count');
  assert(typeof wasmExports['scene_height'] != 'undefined', 'missing Wasm export: scene_height');
  assert(typeof wasmExports['scene_actor_vertex_count'] != 'undefined', 'missing Wasm export: scene_actor_vertex_count');
  assert(typeof wasmExports['scene_actor_vertex'] != 'undefined', 'missing Wasm export: scene_actor_vertex');
  assert(typeof wasmExports['scene_actor_direction'] != 'undefined', 'missing Wasm export: scene_actor_direction');
  assert(typeof wasmExports['vertex_checksum'] != 'undefined', 'missing Wasm export: vertex_checksum');
  assert(typeof wasmExports['scene_surface_height'] != 'undefined', 'missing Wasm export: scene_surface_height');
  assert(typeof wasmExports['scene_test_world_position'] != 'undefined', 'missing Wasm export: scene_test_world_position');
  assert(typeof wasmExports['scene_scenery_count'] != 'undefined', 'missing Wasm export: scene_scenery_count');
  assert(typeof wasmExports['scene_scenery_visible'] != 'undefined', 'missing Wasm export: scene_scenery_visible');
  assert(typeof wasmExports['scene_scenery_matrix'] != 'undefined', 'missing Wasm export: scene_scenery_matrix');
  assert(typeof wasmExports['scene_scenery_model'] != 'undefined', 'missing Wasm export: scene_scenery_model');
  assert(typeof wasmExports['scene_visit_site'] != 'undefined', 'missing Wasm export: scene_visit_site');
  assert(typeof wasmExports['population_mesh_vertices'] != 'undefined', 'missing Wasm export: population_mesh_vertices');
  assert(typeof wasmExports['population_mesh_checksum'] != 'undefined', 'missing Wasm export: population_mesh_checksum');
  assert(typeof wasmExports['population_animation_name'] != 'undefined', 'missing Wasm export: population_animation_name');
  assert(typeof wasmExports['population_animation_duration'] != 'undefined', 'missing Wasm export: population_animation_duration');
  assert(typeof wasmExports['population_marker_draws'] != 'undefined', 'missing Wasm export: population_marker_draws');
  assert(typeof wasmExports['main'] != 'undefined', 'missing Wasm export: main');
  assert(typeof wasmExports['fflush'] != 'undefined', 'missing Wasm export: fflush');
  assert(typeof wasmExports['emscripten_stack_get_end'] != 'undefined', 'missing Wasm export: emscripten_stack_get_end');
  assert(typeof wasmExports['emscripten_stack_get_base'] != 'undefined', 'missing Wasm export: emscripten_stack_get_base');
  assert(typeof wasmExports['strerror'] != 'undefined', 'missing Wasm export: strerror');
  assert(typeof wasmExports['malloc'] != 'undefined', 'missing Wasm export: malloc');
  assert(typeof wasmExports['free'] != 'undefined', 'missing Wasm export: free');
  assert(typeof wasmExports['setThrew'] != 'undefined', 'missing Wasm export: setThrew');
  assert(typeof wasmExports['_emscripten_tempret_set'] != 'undefined', 'missing Wasm export: _emscripten_tempret_set');
  assert(typeof wasmExports['emscripten_stack_init'] != 'undefined', 'missing Wasm export: emscripten_stack_init');
  assert(typeof wasmExports['emscripten_stack_get_free'] != 'undefined', 'missing Wasm export: emscripten_stack_get_free');
  assert(typeof wasmExports['_emscripten_stack_restore'] != 'undefined', 'missing Wasm export: _emscripten_stack_restore');
  assert(typeof wasmExports['_emscripten_stack_alloc'] != 'undefined', 'missing Wasm export: _emscripten_stack_alloc');
  assert(typeof wasmExports['emscripten_stack_get_current'] != 'undefined', 'missing Wasm export: emscripten_stack_get_current');
  assert(typeof wasmExports['__cxa_decrement_exception_refcount'] != 'undefined', 'missing Wasm export: __cxa_decrement_exception_refcount');
  assert(typeof wasmExports['__cxa_increment_exception_refcount'] != 'undefined', 'missing Wasm export: __cxa_increment_exception_refcount');
  assert(typeof wasmExports['__get_exception_message'] != 'undefined', 'missing Wasm export: __get_exception_message');
  assert(typeof wasmExports['__cxa_can_catch'] != 'undefined', 'missing Wasm export: __cxa_can_catch');
  assert(typeof wasmExports['__cxa_get_exception_ptr'] != 'undefined', 'missing Wasm export: __cxa_get_exception_ptr');
  assert(typeof wasmExports['memory'] != 'undefined', 'missing Wasm export: memory');
  assert(typeof wasmExports['__indirect_function_table'] != 'undefined', 'missing Wasm export: __indirect_function_table');
  _inventory_reset = Module['_inventory_reset'] = createExportWrapper('inventory_reset', wasmExports['inventory_reset'], 0);
  _inventory_field = Module['_inventory_field'] = createExportWrapper('inventory_field', wasmExports['inventory_field'], 2);
  _inventory_empty = Module['_inventory_empty'] = createExportWrapper('inventory_empty', wasmExports['inventory_empty'], 2);
  _inventory_add_typed = Module['_inventory_add_typed'] = createExportWrapper('inventory_add_typed', wasmExports['inventory_add_typed'], 3);
  _inventory_add = Module['_inventory_add'] = createExportWrapper('inventory_add', wasmExports['inventory_add'], 2);
  _inventory_equip = Module['_inventory_equip'] = createExportWrapper('inventory_equip', wasmExports['inventory_equip'], 2);
  _inventory_unequip = Module['_inventory_unequip'] = createExportWrapper('inventory_unequip', wasmExports['inventory_unequip'], 1);
  _inventory_equipped = Module['_inventory_equipped'] = createExportWrapper('inventory_equipped', wasmExports['inventory_equipped'], 1);
  _inventory_primary = Module['_inventory_primary'] = createExportWrapper('inventory_primary', wasmExports['inventory_primary'], 0);
  _inventory_item_slot = Module['_inventory_item_slot'] = createExportWrapper('inventory_item_slot', wasmExports['inventory_item_slot'], 1);
  _inventory_item_class = Module['_inventory_item_class'] = createExportWrapper('inventory_item_class', wasmExports['inventory_item_class'], 1);
  _inventory_move = Module['_inventory_move'] = createExportWrapper('inventory_move', wasmExports['inventory_move'], 3);
  _inventory_item_x = Module['_inventory_item_x'] = createExportWrapper('inventory_item_x', wasmExports['inventory_item_x'], 1);
  _inventory_item_y = Module['_inventory_item_y'] = createExportWrapper('inventory_item_y', wasmExports['inventory_item_y'], 1);
  _inventory_free_fields = Module['_inventory_free_fields'] = createExportWrapper('inventory_free_fields', wasmExports['inventory_free_fields'], 0);
  _inventory_slot_error = Module['_inventory_slot_error'] = createExportWrapper('inventory_slot_error', wasmExports['inventory_slot_error'], 2);
  _inventory_item_equip_slot = Module['_inventory_item_equip_slot'] = createExportWrapper('inventory_item_equip_slot', wasmExports['inventory_item_equip_slot'], 1);
  _inventory_item_gender = Module['_inventory_item_gender'] = createExportWrapper('inventory_item_gender', wasmExports['inventory_item_gender'], 1);
  _armor_model_count = Module['_armor_model_count'] = createExportWrapper('armor_model_count', wasmExports['armor_model_count'], 0);
  _armor_model_blueprint = Module['_armor_model_blueprint'] = createExportWrapper('armor_model_blueprint', wasmExports['armor_model_blueprint'], 1);
  _armor_model_additions = Module['_armor_model_additions'] = createExportWrapper('armor_model_additions', wasmExports['armor_model_additions'], 0);
  _armor_model_deletions = Module['_armor_model_deletions'] = createExportWrapper('armor_model_deletions', wasmExports['armor_model_deletions'], 0);
  _combat_brain_enable = Module['_combat_brain_enable'] = createExportWrapper('combat_brain_enable', wasmExports['combat_brain_enable'], 1);
  _combat_monster_attacks = Module['_combat_monster_attacks'] = createExportWrapper('combat_monster_attacks', wasmExports['combat_monster_attacks'], 0);
  _combat_brain_target = Module['_combat_brain_target'] = createExportWrapper('combat_brain_target', wasmExports['combat_brain_target'], 0);
  _combat_monster_busy = Module['_combat_monster_busy'] = createExportWrapper('combat_monster_busy', wasmExports['combat_monster_busy'], 0);
  _combat_monster_movement = Module['_combat_monster_movement'] = createExportWrapper('combat_monster_movement', wasmExports['combat_monster_movement'], 0);
  _combat_monster_action = Module['_combat_monster_action'] = createExportWrapper('combat_monster_action', wasmExports['combat_monster_action'], 0);
  _combat_monster_position = Module['_combat_monster_position'] = createExportWrapper('combat_monster_position', wasmExports['combat_monster_position'], 1);
  _combat_monster_yaw = Module['_combat_monster_yaw'] = createExportWrapper('combat_monster_yaw', wasmExports['combat_monster_yaw'], 0);
  _combat_last_victim_id = Module['_combat_last_victim_id'] = createExportWrapper('combat_last_victim_id', wasmExports['combat_last_victim_id'], 0);
  _combat_last_attacker_id = Module['_combat_last_attacker_id'] = createExportWrapper('combat_last_attacker_id', wasmExports['combat_last_attacker_id'], 0);
  _combat_test_player_death = Module['_combat_test_player_death'] = createExportWrapper('combat_test_player_death', wasmExports['combat_test_player_death'], 0);
  _combat_player_dead = Module['_combat_player_dead'] = createExportWrapper('combat_player_dead', wasmExports['combat_player_dead'], 0);
  _combat_player_hp = Module['_combat_player_hp'] = createExportWrapper('combat_player_hp', wasmExports['combat_player_hp'], 0);
  _combat_player_max_hp = Module['_combat_player_max_hp'] = createExportWrapper('combat_player_max_hp', wasmExports['combat_player_max_hp'], 0);
  _combat_player_teleports = Module['_combat_player_teleports'] = createExportWrapper('combat_player_teleports', wasmExports['combat_player_teleports'], 0);
  _combat_player_death_phase = Module['_combat_player_death_phase'] = createExportWrapper('combat_player_death_phase', wasmExports['combat_player_death_phase'], 0);
  _combat_player_position = Module['_combat_player_position'] = createExportWrapper('combat_player_position', wasmExports['combat_player_position'], 1);
  _combat_test_bad_span = Module['_combat_test_bad_span'] = createExportWrapper('combat_test_bad_span', wasmExports['combat_test_bad_span'], 0);
  _combat_attack_raw = Module['_combat_attack_raw'] = createExportWrapper('combat_attack_raw', wasmExports['combat_attack_raw'], 0);
  _combat_test_reset = Module['_combat_test_reset'] = createExportWrapper('combat_test_reset', wasmExports['combat_test_reset'], 0);
  _combat_test_positions = Module['_combat_test_positions'] = createExportWrapper('combat_test_positions', wasmExports['combat_test_positions'], 3);
  _combat_test_tick = Module['_combat_test_tick'] = createExportWrapper('combat_test_tick', wasmExports['combat_test_tick'], 1);
  _combat_free_xp = Module['_combat_free_xp'] = createExportWrapper('combat_free_xp', wasmExports['combat_free_xp'], 0);
  _combat_max_hp = Module['_combat_max_hp'] = createExportWrapper('combat_max_hp', wasmExports['combat_max_hp'], 0);
  _combat_last_kill_xp = Module['_combat_last_kill_xp'] = createExportWrapper('combat_last_kill_xp', wasmExports['combat_last_kill_xp'], 0);
  _combat_hp = Module['_combat_hp'] = createExportWrapper('combat_hp', wasmExports['combat_hp'], 0);
  _combat_xp = Module['_combat_xp'] = createExportWrapper('combat_xp', wasmExports['combat_xp'], 0);
  _combat_dead = Module['_combat_dead'] = createExportWrapper('combat_dead', wasmExports['combat_dead'], 0);
  _combat_corpse = Module['_combat_corpse'] = createExportWrapper('combat_corpse', wasmExports['combat_corpse'], 0);
  _combat_busy = Module['_combat_busy'] = createExportWrapper('combat_busy', wasmExports['combat_busy'], 0);
  _combat_last_event = Module['_combat_last_event'] = createExportWrapper('combat_last_event', wasmExports['combat_last_event'], 0);
  _combat_last_error = Module['_combat_last_error'] = createExportWrapper('combat_last_error', wasmExports['combat_last_error'], 0);
  _combat_damage = Module['_combat_damage'] = createExportWrapper('combat_damage', wasmExports['combat_damage'], 0);
  _combat_hit_count = Module['_combat_hit_count'] = createExportWrapper('combat_hit_count', wasmExports['combat_hit_count'], 0);
  _combat_evade_count = Module['_combat_evade_count'] = createExportWrapper('combat_evade_count', wasmExports['combat_evade_count'], 0);
  _combat_kill_count = Module['_combat_kill_count'] = createExportWrapper('combat_kill_count', wasmExports['combat_kill_count'], 0);
  _combat_test_roll = Module['_combat_test_roll'] = createExportWrapper('combat_test_roll', wasmExports['combat_test_roll'], 2);
  _stats_active = Module['_stats_active'] = createExportWrapper('stats_active', wasmExports['stats_active'], 0);
  _stats_load_profile = Module['_stats_load_profile'] = createExportWrapper('stats_load_profile', wasmExports['stats_load_profile'], 0);
  _scene_reset = Module['_scene_reset'] = createExportWrapper('scene_reset', wasmExports['scene_reset'], 0);
  _stats_test_baseline = Module['_stats_test_baseline'] = createExportWrapper('stats_test_baseline', wasmExports['stats_test_baseline'], 0);
  _stats_value = Module['_stats_value'] = createExportWrapper('stats_value', wasmExports['stats_value'], 2);
  _stats_raise = Module['_stats_raise'] = createExportWrapper('stats_raise', wasmExports['stats_raise'], 1);
  _stats_notification_count = Module['_stats_notification_count'] = createExportWrapper('stats_notification_count', wasmExports['stats_notification_count'], 0);
  _stats_level = Module['_stats_level'] = createExportWrapper('stats_level', wasmExports['stats_level'], 0);
  _character_name = Module['_character_name'] = createExportWrapper('character_name', wasmExports['character_name'], 0);
  _character_limit = Module['_character_limit'] = createExportWrapper('character_limit', wasmExports['character_limit'], 1);
  _character_check = Module['_character_check'] = createExportWrapper('character_check', wasmExports['character_check'], 6);
  _character_create_gender = Module['_character_create_gender'] = createExportWrapper('character_create_gender', wasmExports['character_create_gender'], 8);
  _character_get_gender = Module['_character_get_gender'] = createExportWrapper('character_get_gender', wasmExports['character_get_gender'], 0);
  _character_create = Module['_character_create'] = createExportWrapper('character_create', wasmExports['character_create'], 7);
  _character_can_save = Module['_character_can_save'] = createExportWrapper('character_can_save', wasmExports['character_can_save'], 0);
  _character_state_json = Module['_character_state_json'] = createExportWrapper('character_state_json', wasmExports['character_state_json'], 0);
  _character_import = Module['_character_import'] = createExportWrapper('character_import', wasmExports['character_import'], 2);
  _scene_player_killed = Module['_scene_player_killed'] = createExportWrapper('scene_player_killed', wasmExports['scene_player_killed'], 0);
  _hud_bar_rect = Module['_hud_bar_rect'] = createExportWrapper('hud_bar_rect', wasmExports['hud_bar_rect'], 4);
  _hud_vital_value = Module['_hud_vital_value'] = createExportWrapper('hud_vital_value', wasmExports['hud_vital_value'], 2);
  _hud_round = Module['_hud_round'] = createExportWrapper('hud_round', wasmExports['hud_round'], 1);
  _inventory_ui_item_rect = Module['_inventory_ui_item_rect'] = createExportWrapper('inventory_ui_item_rect', wasmExports['inventory_ui_item_rect'], 6);
  _inventory_ui_slot_rect = Module['_inventory_ui_slot_rect'] = createExportWrapper('inventory_ui_slot_rect', wasmExports['inventory_ui_slot_rect'], 4);
  _inventory_ui_hit = Module['_inventory_ui_hit'] = createExportWrapper('inventory_ui_hit', wasmExports['inventory_ui_hit'], 5);
  _scene_material_count = Module['_scene_material_count'] = createExportWrapper('scene_material_count', wasmExports['scene_material_count'], 0);
  _scene_lighting = Module['_scene_lighting'] = createExportWrapper('scene_lighting', wasmExports['scene_lighting'], 1);
  _scene_material_probe = Module['_scene_material_probe'] = createExportWrapper('scene_material_probe', wasmExports['scene_material_probe'], 4);
  _scene_terrain_material_probe = Module['_scene_terrain_material_probe'] = createExportWrapper('scene_terrain_material_probe', wasmExports['scene_terrain_material_probe'], 2);
  _core_sky_draw_count = Module['_core_sky_draw_count'] = createExportWrapper('core_sky_draw_count', wasmExports['core_sky_draw_count'], 0);
  _core_sky_vertex_count = Module['_core_sky_vertex_count'] = createExportWrapper('core_sky_vertex_count', wasmExports['core_sky_vertex_count'], 1);
  _core_sky_vertex = Module['_core_sky_vertex'] = createExportWrapper('core_sky_vertex', wasmExports['core_sky_vertex'], 3);
  _core_sky_cloud_phase = Module['_core_sky_cloud_phase'] = createExportWrapper('core_sky_cloud_phase', wasmExports['core_sky_cloud_phase'], 0);
  _core_sky_diagnostic_clock = Module['_core_sky_diagnostic_clock'] = createExportWrapper('core_sky_diagnostic_clock', wasmExports['core_sky_diagnostic_clock'], 1);
  _population_is_active = Module['_population_is_active'] = createExportWrapper('population_is_active', wasmExports['population_is_active'], 0);
  _population_count = Module['_population_count'] = createExportWrapper('population_count', wasmExports['population_count'], 0);
  _population_id = Module['_population_id'] = createExportWrapper('population_id', wasmExports['population_id'], 1);
  _population_position = Module['_population_position'] = createExportWrapper('population_position', wasmExports['population_position'], 2);
  _population_generator_count = Module['_population_generator_count'] = createExportWrapper('population_generator_count', wasmExports['population_generator_count'], 1);
  _population_blueprint = Module['_population_blueprint'] = createExportWrapper('population_blueprint', wasmExports['population_blueprint'], 1);
  _population_name = Module['_population_name'] = createExportWrapper('population_name', wasmExports['population_name'], 1);
  _population_speed = Module['_population_speed'] = createExportWrapper('population_speed', wasmExports['population_speed'], 1);
  _population_brain_target = Module['_population_brain_target'] = createExportWrapper('population_brain_target', wasmExports['population_brain_target'], 1);
  _population_dead = Module['_population_dead'] = createExportWrapper('population_dead', wasmExports['population_dead'], 1);
  _population_hp = Module['_population_hp'] = createExportWrapper('population_hp', wasmExports['population_hp'], 1);
  _population_target = Module['_population_target'] = createExportWrapper('population_target', wasmExports['population_target'], 0);
  _population_select = Module['_population_select'] = createExportWrapper('population_select', wasmExports['population_select'], 1);
  _population_test_remove = Module['_population_test_remove'] = createExportWrapper('population_test_remove', wasmExports['population_test_remove'], 1);
  _loot_available = Module['_loot_available'] = createExportWrapper('loot_available', wasmExports['loot_available'], 0);
  _loot_target = Module['_loot_target'] = createExportWrapper('loot_target', wasmExports['loot_target'], 1);
  _loot_selected = Module['_loot_selected'] = createExportWrapper('loot_selected', wasmExports['loot_selected'], 0);
  _loot_generated = Module['_loot_generated'] = createExportWrapper('loot_generated', wasmExports['loot_generated'], 0);
  _loot_placed = Module['_loot_placed'] = createExportWrapper('loot_placed', wasmExports['loot_placed'], 0);
  _loot_discarded = Module['_loot_discarded'] = createExportWrapper('loot_discarded', wasmExports['loot_discarded'], 0);
  _loot_temporary_count = Module['_loot_temporary_count'] = createExportWrapper('loot_temporary_count', wasmExports['loot_temporary_count'], 0);
  _inventory_items_json = Module['_inventory_items_json'] = createExportWrapper('inventory_items_json', wasmExports['inventory_items_json'], 0);
  _loot_test_random = Module['_loot_test_random'] = createExportWrapper('loot_test_random', wasmExports['loot_test_random'], 1);
  _loot_test_pick = Module['_loot_test_pick'] = createExportWrapper('loot_test_pick', wasmExports['loot_test_pick'], 3);
  _inventory_add_source_item = Module['_inventory_add_source_item'] = createExportWrapper('inventory_add_source_item', wasmExports['inventory_add_source_item'], 3);
  _inventory_item_subclass = Module['_inventory_item_subclass'] = createExportWrapper('inventory_item_subclass', wasmExports['inventory_item_subclass'], 1);
  _inventory_item_variant = Module['_inventory_item_variant'] = createExportWrapper('inventory_item_variant', wasmExports['inventory_item_variant'], 1);
  _inventory_item_can_equip = Module['_inventory_item_can_equip'] = createExportWrapper('inventory_item_can_equip', wasmExports['inventory_item_can_equip'], 1);
  _scene_controller_version = Module['_scene_controller_version'] = createExportWrapper('scene_controller_version', wasmExports['scene_controller_version'], 0);
  _scene_movement_mode = Module['_scene_movement_mode'] = createExportWrapper('scene_movement_mode', wasmExports['scene_movement_mode'], 0);
  _scene_input = Module['_scene_input'] = createExportWrapper('scene_input', wasmExports['scene_input'], 1);
  _scene_pause = Module['_scene_pause'] = createExportWrapper('scene_pause', wasmExports['scene_pause'], 1);
  _scene_step = Module['_scene_step'] = createExportWrapper('scene_step', wasmExports['scene_step'], 2);
  _scene_population_visit = Module['_scene_population_visit'] = createExportWrapper('scene_population_visit', wasmExports['scene_population_visit'], 1);
  _scene_enemy_checksum = Module['_scene_enemy_checksum'] = createExportWrapper('scene_enemy_checksum', wasmExports['scene_enemy_checksum'], 0);
  _scene_attack = Module['_scene_attack'] = createExportWrapper('scene_attack', wasmExports['scene_attack'], 0);
  _scene_enemy_position = Module['_scene_enemy_position'] = createExportWrapper('scene_enemy_position', wasmExports['scene_enemy_position'], 2);
  _scene_death = Module['_scene_death'] = createExportWrapper('scene_death', wasmExports['scene_death'], 0);
  _scene_add_automag = Module['_scene_add_automag'] = createExportWrapper('scene_add_automag', wasmExports['scene_add_automag'], 0);
  _scene_weapon_visible = Module['_scene_weapon_visible'] = createExportWrapper('scene_weapon_visible', wasmExports['scene_weapon_visible'], 0);
  _scene_animation_name = Module['_scene_animation_name'] = createExportWrapper('scene_animation_name', wasmExports['scene_animation_name'], 0);
  _scene_animation_duration = Module['_scene_animation_duration'] = createExportWrapper('scene_animation_duration', wasmExports['scene_animation_duration'], 0);
  _scene_weapon_vertex_count = Module['_scene_weapon_vertex_count'] = createExportWrapper('scene_weapon_vertex_count', wasmExports['scene_weapon_vertex_count'], 0);
  _scene_weapon_checksum = Module['_scene_weapon_checksum'] = createExportWrapper('scene_weapon_checksum', wasmExports['scene_weapon_checksum'], 0);
  _scene_weapon_vertex = Module['_scene_weapon_vertex'] = createExportWrapper('scene_weapon_vertex', wasmExports['scene_weapon_vertex'], 2);
  _scene_armor_vertex_count = Module['_scene_armor_vertex_count'] = createExportWrapper('scene_armor_vertex_count', wasmExports['scene_armor_vertex_count'], 1);
  _scene_armor_vertex = Module['_scene_armor_vertex'] = createExportWrapper('scene_armor_vertex', wasmExports['scene_armor_vertex'], 3);
  _scene_sky_view = Module['_scene_sky_view'] = createExportWrapper('scene_sky_view', wasmExports['scene_sky_view'], 1);
  _scene_orbit = Module['_scene_orbit'] = createExportWrapper('scene_orbit', wasmExports['scene_orbit'], 1);
  _scene_position = Module['_scene_position'] = createExportWrapper('scene_position', wasmExports['scene_position'], 1);
  _scene_yaw = Module['_scene_yaw'] = createExportWrapper('scene_yaw', wasmExports['scene_yaw'], 0);
  _scene_mode = Module['_scene_mode'] = createExportWrapper('scene_mode', wasmExports['scene_mode'], 0);
  _frame_count = Module['_frame_count'] = createExportWrapper('frame_count', wasmExports['frame_count'], 0);
  _scene_height = Module['_scene_height'] = createExportWrapper('scene_height', wasmExports['scene_height'], 2);
  _scene_actor_vertex_count = Module['_scene_actor_vertex_count'] = createExportWrapper('scene_actor_vertex_count', wasmExports['scene_actor_vertex_count'], 1);
  _scene_actor_vertex = Module['_scene_actor_vertex'] = createExportWrapper('scene_actor_vertex', wasmExports['scene_actor_vertex'], 3);
  _scene_actor_direction = Module['_scene_actor_direction'] = createExportWrapper('scene_actor_direction', wasmExports['scene_actor_direction'], 4);
  _vertex_checksum = Module['_vertex_checksum'] = createExportWrapper('vertex_checksum', wasmExports['vertex_checksum'], 0);
  _scene_surface_height = Module['_scene_surface_height'] = createExportWrapper('scene_surface_height', wasmExports['scene_surface_height'], 2);
  _scene_test_world_position = Module['_scene_test_world_position'] = createExportWrapper('scene_test_world_position', wasmExports['scene_test_world_position'], 2);
  _scene_scenery_count = Module['_scene_scenery_count'] = createExportWrapper('scene_scenery_count', wasmExports['scene_scenery_count'], 0);
  _scene_scenery_visible = Module['_scene_scenery_visible'] = createExportWrapper('scene_scenery_visible', wasmExports['scene_scenery_visible'], 0);
  _scene_scenery_matrix = Module['_scene_scenery_matrix'] = createExportWrapper('scene_scenery_matrix', wasmExports['scene_scenery_matrix'], 2);
  _scene_scenery_model = Module['_scene_scenery_model'] = createExportWrapper('scene_scenery_model', wasmExports['scene_scenery_model'], 1);
  _scene_visit_site = Module['_scene_visit_site'] = createExportWrapper('scene_visit_site', wasmExports['scene_visit_site'], 1);
  _population_mesh_vertices = Module['_population_mesh_vertices'] = createExportWrapper('population_mesh_vertices', wasmExports['population_mesh_vertices'], 1);
  _population_mesh_checksum = Module['_population_mesh_checksum'] = createExportWrapper('population_mesh_checksum', wasmExports['population_mesh_checksum'], 1);
  _population_animation_name = Module['_population_animation_name'] = createExportWrapper('population_animation_name', wasmExports['population_animation_name'], 1);
  _population_animation_duration = Module['_population_animation_duration'] = createExportWrapper('population_animation_duration', wasmExports['population_animation_duration'], 1);
  _population_marker_draws = Module['_population_marker_draws'] = createExportWrapper('population_marker_draws', wasmExports['population_marker_draws'], 0);
  _main = Module['_main'] = createExportWrapper('main', wasmExports['main'], 2);
  _fflush = createExportWrapper('fflush', wasmExports['fflush'], 1);
  _emscripten_stack_get_end = wasmExports['emscripten_stack_get_end'];
  _emscripten_stack_get_base = wasmExports['emscripten_stack_get_base'];
  _strerror = createExportWrapper('strerror', wasmExports['strerror'], 1);
  _malloc = createExportWrapper('malloc', wasmExports['malloc'], 1);
  _free = createExportWrapper('free', wasmExports['free'], 1);
  _setThrew = createExportWrapper('setThrew', wasmExports['setThrew'], 2);
  __emscripten_tempret_set = createExportWrapper('_emscripten_tempret_set', wasmExports['_emscripten_tempret_set'], 1);
  _emscripten_stack_init = wasmExports['emscripten_stack_init'];
  _emscripten_stack_get_free = wasmExports['emscripten_stack_get_free'];
  __emscripten_stack_restore = wasmExports['_emscripten_stack_restore'];
  __emscripten_stack_alloc = wasmExports['_emscripten_stack_alloc'];
  _emscripten_stack_get_current = wasmExports['emscripten_stack_get_current'];
  ___cxa_decrement_exception_refcount = createExportWrapper('__cxa_decrement_exception_refcount', wasmExports['__cxa_decrement_exception_refcount'], 1);
  ___cxa_increment_exception_refcount = createExportWrapper('__cxa_increment_exception_refcount', wasmExports['__cxa_increment_exception_refcount'], 1);
  ___get_exception_message = createExportWrapper('__get_exception_message', wasmExports['__get_exception_message'], 3);
  ___cxa_can_catch = createExportWrapper('__cxa_can_catch', wasmExports['__cxa_can_catch'], 3);
  ___cxa_get_exception_ptr = createExportWrapper('__cxa_get_exception_ptr', wasmExports['__cxa_get_exception_ptr'], 1);
  memory = wasmMemory = wasmExports['memory'];
  __indirect_function_table = wasmTable = wasmExports['__indirect_function_table'];
}

var wasmImports = {
  /** @export */
  __assert_fail: ___assert_fail,
  /** @export */
  __cxa_begin_catch: ___cxa_begin_catch,
  /** @export */
  __cxa_call_unexpected: ___cxa_call_unexpected,
  /** @export */
  __cxa_end_catch: ___cxa_end_catch,
  /** @export */
  __cxa_find_matching_catch_2: ___cxa_find_matching_catch_2,
  /** @export */
  __cxa_find_matching_catch_3: ___cxa_find_matching_catch_3,
  /** @export */
  __cxa_rethrow: ___cxa_rethrow,
  /** @export */
  __cxa_throw: ___cxa_throw,
  /** @export */
  __cxa_uncaught_exceptions: ___cxa_uncaught_exceptions,
  /** @export */
  __resumeException: ___resumeException,
  /** @export */
  __syscall_fcntl64: ___syscall_fcntl64,
  /** @export */
  __syscall_ioctl: ___syscall_ioctl,
  /** @export */
  __syscall_openat: ___syscall_openat,
  /** @export */
  _abort_js: __abort_js,
  /** @export */
  _tzset_js: __tzset_js,
  /** @export */
  emscripten_force_exit: _emscripten_force_exit,
  /** @export */
  emscripten_get_now: _emscripten_get_now,
  /** @export */
  emscripten_resize_heap: _emscripten_resize_heap,
  /** @export */
  emscripten_set_main_loop: _emscripten_set_main_loop,
  /** @export */
  emscripten_webgl_create_context: _emscripten_webgl_create_context,
  /** @export */
  emscripten_webgl_make_context_current: _emscripten_webgl_make_context_current,
  /** @export */
  environ_get: _environ_get,
  /** @export */
  environ_sizes_get: _environ_sizes_get,
  /** @export */
  fd_close: _fd_close,
  /** @export */
  fd_read: _fd_read,
  /** @export */
  fd_seek: _fd_seek,
  /** @export */
  fd_write: _fd_write,
  /** @export */
  glActiveTexture: _glActiveTexture,
  /** @export */
  glAttachShader: _glAttachShader,
  /** @export */
  glBindAttribLocation: _glBindAttribLocation,
  /** @export */
  glBindBuffer: _glBindBuffer,
  /** @export */
  glBindFramebuffer: _glBindFramebuffer,
  /** @export */
  glBindTexture: _glBindTexture,
  /** @export */
  glBlendFunc: _glBlendFunc,
  /** @export */
  glBufferData: _glBufferData,
  /** @export */
  glCheckFramebufferStatus: _glCheckFramebufferStatus,
  /** @export */
  glClear: _glClear,
  /** @export */
  glClearColor: _glClearColor,
  /** @export */
  glCompileShader: _glCompileShader,
  /** @export */
  glCreateProgram: _glCreateProgram,
  /** @export */
  glCreateShader: _glCreateShader,
  /** @export */
  glDeleteBuffers: _glDeleteBuffers,
  /** @export */
  glDeleteFramebuffers: _glDeleteFramebuffers,
  /** @export */
  glDeleteProgram: _glDeleteProgram,
  /** @export */
  glDeleteTextures: _glDeleteTextures,
  /** @export */
  glDepthMask: _glDepthMask,
  /** @export */
  glDisable: _glDisable,
  /** @export */
  glDisableVertexAttribArray: _glDisableVertexAttribArray,
  /** @export */
  glDrawArrays: _glDrawArrays,
  /** @export */
  glDrawElements: _glDrawElements,
  /** @export */
  glEnable: _glEnable,
  /** @export */
  glEnableVertexAttribArray: _glEnableVertexAttribArray,
  /** @export */
  glFramebufferTexture2D: _glFramebufferTexture2D,
  /** @export */
  glGenBuffers: _glGenBuffers,
  /** @export */
  glGenFramebuffers: _glGenFramebuffers,
  /** @export */
  glGenTextures: _glGenTextures,
  /** @export */
  glGenerateMipmap: _glGenerateMipmap,
  /** @export */
  glGetProgramiv: _glGetProgramiv,
  /** @export */
  glGetShaderInfoLog: _glGetShaderInfoLog,
  /** @export */
  glGetShaderiv: _glGetShaderiv,
  /** @export */
  glGetUniformLocation: _glGetUniformLocation,
  /** @export */
  glLinkProgram: _glLinkProgram,
  /** @export */
  glReadPixels: _glReadPixels,
  /** @export */
  glShaderSource: _glShaderSource,
  /** @export */
  glTexImage2D: _glTexImage2D,
  /** @export */
  glTexParameteri: _glTexParameteri,
  /** @export */
  glUniform1f: _glUniform1f,
  /** @export */
  glUniform1i: _glUniform1i,
  /** @export */
  glUniform3f: _glUniform3f,
  /** @export */
  glUniform3fv: _glUniform3fv,
  /** @export */
  glUniformMatrix4fv: _glUniformMatrix4fv,
  /** @export */
  glUseProgram: _glUseProgram,
  /** @export */
  glVertexAttribPointer: _glVertexAttribPointer,
  /** @export */
  glViewport: _glViewport,
  /** @export */
  invoke_diii,
  /** @export */
  invoke_fff,
  /** @export */
  invoke_fiii,
  /** @export */
  invoke_i,
  /** @export */
  invoke_ii,
  /** @export */
  invoke_iif,
  /** @export */
  invoke_iii,
  /** @export */
  invoke_iiii,
  /** @export */
  invoke_iiiii,
  /** @export */
  invoke_iiiiid,
  /** @export */
  invoke_iiiiii,
  /** @export */
  invoke_iiiiiii,
  /** @export */
  invoke_iiiiiiii,
  /** @export */
  invoke_iiiiiiiiiiii,
  /** @export */
  invoke_iiiiiiiiiiiii,
  /** @export */
  invoke_iiiiij,
  /** @export */
  invoke_iij,
  /** @export */
  invoke_iiji,
  /** @export */
  invoke_iijii,
  /** @export */
  invoke_ijiii,
  /** @export */
  invoke_ji,
  /** @export */
  invoke_jiiii,
  /** @export */
  invoke_v,
  /** @export */
  invoke_vi,
  /** @export */
  invoke_vii,
  /** @export */
  invoke_viiff,
  /** @export */
  invoke_viii,
  /** @export */
  invoke_viiii,
  /** @export */
  invoke_viiiiii,
  /** @export */
  invoke_viiiiiii,
  /** @export */
  invoke_viiiiiiiii,
  /** @export */
  invoke_viiiiiiiiii,
  /** @export */
  invoke_viiiiiiiiiiiiiii,
  /** @export */
  invoke_viijii,
  /** @export */
  invoke_viji,
  /** @export */
  invoke_vj,
  /** @export */
  invoke_vji,
  /** @export */
  invoke_vjjii
};

function invoke_vii(index,a1,a2) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_ii(index,a1) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_v(index) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)();
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viii(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiff(index,a1,a2,a3,a4) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1,a2,a3,a4);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiji(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiii(index,a1,a2,a3,a4) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1,a2,a3,a4);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1,a2,a3,a4,a5,a6);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iijii(index,a1,a2,a3,a4) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2,a3,a4);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_vi(index,a1) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viji(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_vj(index,a1) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_i(index) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)();
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iif(index,a1,a2) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_vji(index,a1,a2) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_ji(index,a1) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
    return 0n;
  }
}

function invoke_fff(index,a1,a2) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iij(index,a1,a2) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_jiiii(index,a1,a2,a3,a4) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2,a3,a4);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
    return 0n;
  }
}

function invoke_ijiii(index,a1,a2,a3,a4) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2,a3,a4);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_vjjii(index,a1,a2,a3,a4) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1,a2,a3,a4);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiii(index,a1,a2,a3,a4) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2,a3,a4);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1,a2,a3,a4,a5,a6,a7,a8,a9);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiiii(index,a1,a2,a3,a4,a5,a6) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2,a3,a4,a5,a6);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viijii(index,a1,a2,a3,a4,a5) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1,a2,a3,a4,a5);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiii(index,a1,a2,a3,a4,a5) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2,a3,a4,a5);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiij(index,a1,a2,a3,a4,a5) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2,a3,a4,a5);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiid(index,a1,a2,a3,a4,a5) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2,a3,a4,a5);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiiiii(index,a1,a2,a3,a4,a5,a6,a7) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_fiii(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_diii(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiiiii(index,a1,a2,a3,a4,a5,a6,a7) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11) {
  var sp = stackSave();
  try {
    return getWasmTableEntry(index)(a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1,a2,a3,a4,a5,a6,a7,a8,a9,a10);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiiiiiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13,a14,a15) {
  var sp = stackSave();
  try {
    getWasmTableEntry(index)(a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13,a14,a15);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}


// include: postamble.js
// === Auto-generated postamble setup entry stuff ===

var calledRun;

function callMain() {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
  assert(typeof onPreRuns === 'undefined' || onPreRuns.length == 0, 'cannot call main when preRun functions remain to be called');

  var entryFunction = _main;

  var argc = 0;
  var argv = 0;

  try {

    var ret = entryFunction(argc, argv);

    // if we're not running an evented main loop, it's time to exit
    exitJS(ret, /* implicit = */ true);
    return ret;
  } catch (e) {
    return handleException(e);
  }
}

function stackCheckInit() {
  // This is normally called automatically during __wasm_call_ctors but need to
  // get these values before even running any of the ctors so we call it redundantly
  // here.
  _emscripten_stack_init();
  // TODO(sbc): Move writeStackCookie to native to to avoid this.
  writeStackCookie();
}

async function run() {
  assert(!calledRun);
  calledRun = true;

  stackCheckInit();

  preRun();

  if (runDependencies) {
    await resolveRunDependencies();
  }

  var setStatus = Module['setStatus'];
  if (setStatus) {
    setStatus('Running...');
    // Yield to the event loop to allow the browser to paint "Running..."
    await new Promise((resolve) => setTimeout(resolve, 1));
    // Then we want to clear the status text, but only after the rest of this function runs.
    setTimeout(setStatus, 1, '');
  }

  if (ABORT) return;

  initRuntime();

  // No ATMAINS hooks

  Module['onRuntimeInitialized']?.();
  consumedModuleProp('onRuntimeInitialized');

  var noInitialRun = Module['noInitialRun'] || false;
  if (!noInitialRun) callMain();

  postRun();
}

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var oldOut = out;
  var oldErr = err;
  var has = false;
  out = err = (x) => {
    has = true;
  }
  try { // it doesn't matter if it fails
    _fflush(0);
    // also flush in the JS FS layer
    for (var tty of Object.values(TTY.ttys)) {
      if (tty.output.length) {
        has = true;
      }
    }
  } catch(e) {}
  out = oldOut;
  err = oldErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.');
  }
}

var wasmExports;

// With async instantation wasmExports is assigned asynchronously when the
// instance is received.
createWasm().then(() => run());

// end include: postamble.js

