// 工具模块
class Logger {
  constructor() {
    this.enableDebug = false;
  }

  _Format(args) {
    return [`[${FormatDate(new Date())}]`, ...args];
  }

  SetEnableDebug(enable) {
    this.enableDebug = enable;
  }

  Debug(...args) {
    if (this.enableDebug) {
      console.debug(...this._Format(args));
    }
  }

  Info(...args) {
    console.log(...this._Format(args));
  }

  Warn(...args) {
    console.warn(...this._Format(args));
  }

  Error(...args) {
    console.error(...this._Format(args));
  }
}

const logger = new Logger();

function FormatDate(date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')},${date.getMilliseconds().toString().padStart(3, '0')}`;
}

class StringTools {
  AreEqual(valueA, valueB, ignoreCase) {
    if (valueA === valueB) {
      return true;
    } else if (!valueA || !valueB) {
      return false;
    }
    if (ignoreCase) {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }
    return valueA === valueB;
  }

  SafeReplaceString(str, valueToReplace, replacement) {
    const startIndex = str.indexOf(valueToReplace);
    const beginStr = str.slice(0, startIndex);
    const endStr = str.slice(startIndex + valueToReplace.length);
    let result = beginStr;
    result += replacement;
    result += endStr;
    return result;
  }

  GetFunctionBody(func) {
    const functionCode = func.toString();
    const openBracketIndex = functionCode.indexOf("{");
    const closeBracketIndex = functionCode.lastIndexOf("}");
    const functionBody = functionCode.substring(openBracketIndex + 1, closeBracketIndex);
    return functionBody;
  }
}

const stringTools = new StringTools();

class BrowserTools {
  TabHasUrl(tab, targetUrl) {
    const tabUrl = tab.url ? tab.url : '';
    return stringTools.AreEqual(targetUrl, tabUrl, true);
  }

  GetTabsWithUrl(tabs, targetUrl) {
    const matchedTabs = [];
    for (const tab of tabs) {
      if (this.TabHasUrl(tab, targetUrl)) {
        matchedTabs.push(tab);
      }
    }
    return matchedTabs;
  }

  GetPlatform() {
    let platform = "win32";
    const appVersion = navigator.appVersion.toLowerCase();
    if (appVersion.indexOf("mac") != -1) {
      platform = "darwin";
    } else if (appVersion.indexOf("linux") != -1) {
      platform = "linux";
    }
    return platform;
  }

  GetChromiumVersion() {
    const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
    return raw ? parseInt(raw[2], 10) : 0;
  }

  ForAllSequential(values, processValueCb, onCompletedAllCb) {
    let valueIndex = 0;
    const doNextAction = () => {
      if (valueIndex >= values.length) {
        if (onCompletedAllCb) {
          onCompletedAllCb();
        }
        return;
      }
      processValueCb(values[valueIndex++], doNextAction);
    };
    doNextAction();
  }

  async ValidatePermissions() {
    // 验证cookies权限
    if (chrome.cookies && chrome.cookies.getAllCookieStores) {
      try {
        const cookieStores = await chrome.cookies.getAllCookieStores();
        for (const store of cookieStores) {
          logger.Info("Cookie Store Id: " + store.id);
        }
      } catch (err) {
        logger.Error("ValidatePermissions - cookies error: " + err);
      }
    }

    // 验证webNavigation权限
    if (chrome.webNavigation && chrome.webNavigation.getAllFrames) {
      try {
        const tabs = await chrome.tabs.query({ active: true });
        if (tabs.length != 0) {
          const frameDetails = await chrome.webNavigation.getAllFrames({
            tabId: tabs[0].id || 0
          });
          if (frameDetails && frameDetails.length != 0) {
            logger.Info("Active Tab Frame URL: " + frameDetails[0].url);
          }
        }
      } catch (err) {
        logger.Error("ValidatePermissions - webNavigation error: " + err);
      }
    }

    // 验证downloads权限
    if (chrome.downloads && chrome.downloads.search) {
      try {
        const downloadItems = await chrome.downloads.search({
          url: "https://www.winrobot360.com/"
        });
        if (downloadItems.length != 0) {
          logger.Info("download item url:", downloadItems[0].url);
        }
      } catch (err) {
        logger.Error("ValidatePermissions - downloads error: " + err);
      }
    }

    // 验证clipboard权限
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText('https://www.winrobot360.com/');
        const text = await navigator.clipboard.readText();
        logger.Info("clipboard text:", text);
      } catch (err) {
        logger.Error("ValidatePermissions - clipboard error: " + err);
      }
    }

    // 验证scripting权限
    if (chrome.scripting && chrome.scripting.executeScript) {
      try {
        const tabs = await chrome.tabs.query({ active: true });
        if (tabs.length != 0) {
          const checkCmplFunc = () => {
            return document.readyState === "complete";
          };
          await chrome.scripting.executeScript({
            target: {
              allFrames: true,
              tabId: tabs[0].id || 0
            },
            func: checkCmplFunc,
            args: []
          });
        }
      } catch (err) {
        logger.Error("ValidatePermissions - scripting error: " + err);
      }
    }

    // 验证nativeMessaging权限
    try {
      const conn = chrome.runtime.connectNative("shadowbot.chrome.bridge");
      conn.onMessage.addListener((message) => {
        if (message) {
          logger.Info("onNativeMsg:", message);
        } else {
          logger.Error("unknown msg format: " + message);
        }
      });
    } catch (err) {
      logger.Error("ValidatePermissions - nativeMessaging error: " + err);
    }
  }
}

const browserTools = new BrowserTools();

// 服务模块
class GlobalVariable {
  static RegisterAll(inServiceWorker) {
    if (inServiceWorker) {
      globalThis.window = globalThis;
    }
    window.wnd2HwndDict = {};
    window.xbotDriver = {
      version: '1.0.1',
      evalService: null,
      logger: logger,
      inServiceWorker: inServiceWorker
    };
  }

  static RegisterEvalService(evalService) {
    if (window.xbotDriver) {
      window.xbotDriver.evalService = evalService;
    }
  }
}

// 假设的其他服务模块
class NativeHost {
  constructor() {
    // 实现细节
  }

  async Start(callback) {
    // 实现细节
  }

  GetBridgeInterfaceVersion() {
    // 实现细节
    return "1.0.0";
  }

  PostMessage(message) {
    // 实现细节
  }

  Response(response) {
    // 实现细节
  }
}

class EvalService {
  constructor(tabId) {
    this.tabId = tabId;
    // 实现细节
  }
}

class ReturnCallbackMap {
  constructor() {
    this.map = new Map();
    this.counter = 0;
  }

  RegisterReturnCallback(callback) {
    const id = ++this.counter;
    this.map.set(id, callback);
    return id;
  }

  HandleReturnCallback(requestId, params) {
    const callback = this.map.get(requestId);
    if (callback) {
      callback(params);
      this.map.delete(requestId);
    }
  }
}

class BackgroundpageService {
  OpenExtensionWindowIfNeeded() {
    // 实现细节
  }
}

// 处理器模块
class Factory {
  static CreateWindowHandler(loader) {
    // 实现细节
    return {
      Init: async () => {
        // 实现细节
      },
      canHandleMessage: (message) => {
        // 实现细节
        return false;
      },
      handleMessage: (message) => {
        // 实现细节
      }
    };
  }
}

// 核心加载器
class LoaderPortable {
  constructor(inServiceWorker) {
    GlobalVariable.RegisterAll(inServiceWorker);

    // 共享的变量
    this.inServiceWorker = inServiceWorker;
    this.nativeHost = new NativeHost();
    this.extensionWndId = 0;
    this.extensionTabId = 0;
    this.evalService = null;

    // 消息处理器
    this.msgHandler = null;

    // 按需缓存第一条uia消息
    this.canHandleUiaMsg = false;
    this.firstUiaMsg = null;

    // 回调类消息
    this.callbackMap = new ReturnCallbackMap();
  }

  async Init() {
    logger.Info("[LoaderPortable::Init] connect nativeHost start");
    await this.nativeHost.Start((message) => {
      // provider在连接上nativeHost后，会无脑发送消息，因此必须第一时间注册消息处理器
      this.DispatchMessage(message);
    });
    logger.Info("[LoaderPortable::Init] connect nativeHost finish");
    logger.Info("[LoaderPortable::Init] bridgeInterfaceVersion: " + this.nativeHost.GetBridgeInterfaceVersion());

    if (this.inServiceWorker) {
      this.evalService = new EvalService(null);
      GlobalVariable.RegisterEvalService(this.evalService);
    } else {
      const extWnd = await chrome.windows.getCurrent();
      this.extensionWndId = extWnd.id || 0;
      logger.Info("[LoaderPortable::Init] extensionWndId: " + this.extensionWndId);

      const tabs = await chrome.tabs.query({ currentWindow: true });
      const extensionTab = tabs.find(tab => tab.url === chrome.runtime.getURL('BackgroundPage.html'));
      if (extensionTab) {
        this.extensionTabId = extensionTab.id;
        logger.Info("[LoaderPortable::Init] extensionTabId: " + this.extensionTabId);
      } else {
        logger.Error("[LoaderPortable::Init] failed to get extensionTabId");
      }

      this.evalService = new EvalService(this.extensionTabId);
      GlobalVariable.RegisterEvalService(this.evalService);
    }

    logger.Info("[LoaderPortable::Init] register windowHandler");
    this.msgHandler = Factory.CreateWindowHandler(this);
    logger.Info("[LoaderPortable::Init] windowHandler init start");
    await this.msgHandler.Init();
    logger.Info("[LoaderPortable::Init] windowHandler init finish");
    this.EnableUiaMsgHandle();
  }

  EnableUiaMsgHandle() {
    logger.Info("[LoaderPortable::EnableUiaMsgHandle]");
    this.canHandleUiaMsg = true;
    if (this.firstUiaMsg) {
      const msg = this.firstUiaMsg;
      this.firstUiaMsg = null;
      logger.Info("[LoaderPortable::EnableUiaMsgHandle] triggerFirstUiaMsg: " + JSON.stringify(msg));
      this.DispatchMessage(msg);
    }
  }

  IsUiaMessage(message) {
    if (typeof message.method === 'string' && message.method !== 'Window.SetHwnd' && !message.method.startsWith("Bridge.")) {
      return true;
    }
    return false;
  }

  DispatchMessage(message) {
    logger.Debug("[LoaderPortable::DispatchMessage] " + JSON.stringify(message));
    if (!message) {
      logger.Error("[LoaderPortable::DispatchMessage] unknown msg format: " + message);
      return;
    }

    // uia 消息在 windowHandler.Init() 结束前到来了，此时需要缓存它
    if (!this.canHandleUiaMsg && this.IsUiaMessage(message)) {
      this.firstUiaMsg = message;
      logger.Info("[LoaderPortable::DispatchMessage] recordFirstUiaMsg: " + JSON.stringify(this.firstUiaMsg));
      return;
    }

    // this.msgHandler = windowHandler 之前的消息无需处理（如：Bridge.GetInterfaceVersion）
    if (!this.msgHandler) {
      logger.Debug("[LoaderPortable::DispatchMessage] ignore message: " + JSON.stringify(message));
      return;
    }

    // 消息处理流程
    if (message.requestId != null) {
      this.callbackMap.HandleReturnCallback(message.requestId, message.params);
      return;
    }
    if (this.msgHandler.canHandleMessage(message)) {
      this.msgHandler.handleMessage(message);
    } else {
      if (window.uiaDispatcher) {
        uiaDispatcher.invoke(message, (response) => {
          this.nativeHost.PostMessage(response);
        });
      } else {
        logger.Error("[LoaderPortable::DispatchMessage] uiaDispatcher not initialized");
        this.nativeHost.Response({
          content: null,
          error: {
            code: -1,
            message: 'uiaDispatcher not initialized'
          }
        });
      }
    }
  }

  CallNativeHostFunction(method, params, returnFunc) {
    if (returnFunc) {
      const requestId = this.callbackMap.RegisterReturnCallback(returnFunc);
      this.nativeHost.PostMessage({
        requestId: requestId,
        method: method,
        params: params
      });
    } else {
      this.nativeHost.PostMessage({
        method: method,
        params: params
      });
    }
  }
}

// 扩展管理器
class ExtensionMgr {
  constructor() {
    ExtensionMgr.RecordActivateTimestamp();
    ExtensionMgr.DisableOldExtension();
    chrome.runtime.onInstalled.addListener(() => {
      return ExtensionMgr.ReloadTabs();
    });
    chrome.management.onEnabled.addListener((extInfo) => {
      if (extInfo.id === 'hofgfmmdolnmimplihglefekekfcfijf' || extInfo.id === 'pciandikfehobiboakociacjeefeafln') {
        logger.Info("[ExtensionMgr::onEnabled] " + extInfo.id);
        ExtensionMgr.ReloadTabs();
      }
    });
  }

  // 记录service_worker的激活时间戳
  static async RecordActivateTimestamp() {
    let activateTimeLst = await chrome.storage.local.get('activate_time_lst');
    activateTimeLst = activateTimeLst['activate_time_lst'] || [];
    const maxLength = 5;
    activateTimeLst.unshift(Date.now());
    activateTimeLst = activateTimeLst.slice(0, maxLength);
    await chrome.storage.local.set({
      'activate_time_lst': activateTimeLst
    });
    activateTimeLst.forEach((activateTime) => {
      return logger.Info("[ExtensionMgr::RecordActivateTimestamp] " + FormatDate(new Date(activateTime)));
    });
  }

  static ReloadTabs() {
    logger.Info("[ExtensionMgr::ReloadTabs]");
    chrome.tabs.query({}, (tabsList) => {
      tabsList.forEach((tab) => {
        chrome.tabs.reload(tab.id, {}, () => {
          if (chrome.runtime.lastError) {
            logger.Info("[ExtensionMgr::ReloadTabs] tabId: " + tab.id + " Error: " + chrome.runtime.lastError.message);
          }
        });
      });
    });
  }

  static DisableOldExtension() {
    if (chrome.management && chrome.management.get && chrome.management.setEnabled) {
      try {
        const oldExtensionId = "nhkjnlcggomjhckdeamipedlomphkepc";
        chrome.management.get(oldExtensionId, (result) => {
          if (chrome.runtime.lastError) {
            // 忽略错误
          } else if (result && result.enabled) {
            logger.Info("[ExtensionMgr::DisableOldExtension] Found deprecated and enabled extension");
            chrome.management.setEnabled(oldExtensionId, false, () => {
              if (chrome.runtime.lastError) {
                logger.Error("[ExtensionMgr::DisableOldExtension] Disable deprecated extension failed, msg: " + chrome.runtime.lastError.message);
              } else {
                logger.Info("[ExtensionMgr::DisableOldExtension] Disabled deprecated extension");
              }
            });
          }
        });
      } catch (e) {
        logger.Error("[ExtensionMgr::DisableOldExtension] Exception: " + e);
      }
    }
  }
}

// 主入口
const extMgr = new ExtensionMgr();
const chromiumVersion = browserTools.GetChromiumVersion();
logger.Info("[BackgroundServiceWorker] chromiumVersion:", chromiumVersion);
if (chromiumVersion < 114) {
  const backgroundPageMgr = new BackgroundpageService();
  backgroundPageMgr.OpenExtensionWindowIfNeeded();
} else {
  const loaderPortable = new LoaderPortable(true);
  loaderPortable.Init();
}