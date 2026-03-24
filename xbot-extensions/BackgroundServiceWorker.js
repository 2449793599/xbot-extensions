/**
 * 影刀RPA Chrome扩展后台服务工作器
 * 功能：
 * 1. 处理扩展的核心逻辑，包括与本地RPA应用的通信
 * 2. 管理扩展的生命周期和权限
 * 3. 处理来自内容脚本和本地应用的消息
 * 4. 提供跨Chrome版本的兼容性支持
 */

/**
 * 工具模块 - 提供各种辅助功能
 */

/**
 * 日志工具类
 * 功能：提供不同级别的日志记录功能，支持调试信息的开关
 */
class Logger {
  constructor() {
    this.enableDebug = false;
  }

  /**
   * 格式化日志消息，添加时间戳
   * @param {Array} args - 日志参数数组
   * @returns {Array} 格式化后的日志参数数组
   */
  _Format(args) {
    return [`[${FormatDate(new Date())}]`, ...args];
  }

  /**
   * 设置是否启用调试日志
   * @param {boolean} enable - 是否启用调试日志
   */
  SetEnableDebug(enable) {
    this.enableDebug = enable;
  }

  /**
   * 记录调试级别的日志
   * @param {...*} args - 日志内容
   */
  Debug(...args) {
    if (this.enableDebug) {
      console.debug(...this._Format(args));
    }
  }

  /**
   * 记录信息级别的日志
   * @param {...*} args - 日志内容
   */
  Info(...args) {
    console.log(...this._Format(args));
  }

  /**
   * 记录警告级别的日志
   * @param {...*} args - 日志内容
   */
  Warn(...args) {
    console.warn(...this._Format(args));
  }

  /**
   * 记录错误级别的日志
   * @param {...*} args - 日志内容
   */
  Error(...args) {
    console.error(...this._Format(args));
  }
}

const logger = new Logger();

/**
 * 格式化日期时间为字符串
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期时间字符串，格式为：YYYY-MM-DD HH:MM:SS,SSS
 */
function FormatDate(date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')},${date.getMilliseconds().toString().padStart(3, '0')}`;
}

/**
 * 字符串工具类
 * 功能：提供字符串处理相关的工具方法
 */
class StringTools {
  /**
   * 比较两个字符串是否相等
   * @param {string} valueA - 第一个字符串
   * @param {string} valueB - 第二个字符串
   * @param {boolean} ignoreCase - 是否忽略大小写
   * @returns {boolean} 两个字符串是否相等
   */
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

  /**
   * 安全替换字符串中的指定值
   * @param {string} str - 原始字符串
   * @param {string} valueToReplace - 要替换的值
   * @param {string} replacement - 替换为的值
   * @returns {string} 替换后的字符串
   */
  SafeReplaceString(str, valueToReplace, replacement) {
    const startIndex = str.indexOf(valueToReplace);
    const beginStr = str.slice(0, startIndex);
    const endStr = str.slice(startIndex + valueToReplace.length);
    let result = beginStr;
    result += replacement;
    result += endStr;
    return result;
  }

  /**
   * 获取函数的函数体
   * @param {Function} func - 函数对象
   * @returns {string} 函数体字符串
   */
  GetFunctionBody(func) {
    const functionCode = func.toString();
    const openBracketIndex = functionCode.indexOf("{");
    const closeBracketIndex = functionCode.lastIndexOf("}");
    const functionBody = functionCode.substring(openBracketIndex + 1, closeBracketIndex);
    return functionBody;
  }
}

const stringTools = new StringTools();

/**
 * 浏览器工具类
 * 功能：提供浏览器相关的工具方法，包括标签页处理、平台检测、Chrome版本检测等
 */
class BrowserTools {
  /**
   * 检查标签页是否包含指定URL
   * @param {Object} tab - Chrome标签页对象
   * @param {string} targetUrl - 目标URL
   * @returns {boolean} 标签页是否包含指定URL
   */
  TabHasUrl(tab, targetUrl) {
    const tabUrl = tab.url ? tab.url : '';
    return stringTools.AreEqual(targetUrl, tabUrl, true);
  }

  /**
   * 获取包含指定URL的标签页列表
   * @param {Array} tabs - 标签页数组
   * @param {string} targetUrl - 目标URL
   * @returns {Array} 包含指定URL的标签页数组
   */
  GetTabsWithUrl(tabs, targetUrl) {
    const matchedTabs = [];
    for (const tab of tabs) {
      if (this.TabHasUrl(tab, targetUrl)) {
        matchedTabs.push(tab);
      }
    }
    return matchedTabs;
  }

  /**
   * 获取当前平台类型
   * @returns {string} 平台类型，可能的值：win32、darwin、linux
   */
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

  /**
   * 获取Chromium版本
   * @returns {number} Chromium版本号
   */
  GetChromiumVersion() {
    const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
    return raw ? parseInt(raw[2], 10) : 0;
  }

  /**
   * 顺序处理数组中的所有值
   * @param {Array} values - 要处理的值数组
   * @param {Function} processValueCb - 处理单个值的回调函数
   * @param {Function} onCompletedAllCb - 所有值处理完成后的回调函数
   */
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

  /**
   * 验证扩展所需的各种权限
   * 功能：测试cookies、webNavigation、downloads、clipboard、scripting、nativeMessaging等权限
   */
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

/**
 * 服务模块 - 提供各种服务功能
 */

/**
 * 全局变量管理类
 * 功能：管理扩展的全局变量，包括窗口映射、驱动实例等
 */
class GlobalVariable {
  /**
   * 注册所有全局变量
   * @param {boolean} inServiceWorker - 是否在Service Worker中运行
   */
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

  /**
   * 注册Eval服务
   * @param {Object} evalService - Eval服务实例
   */
  static RegisterEvalService(evalService) {
    if (window.xbotDriver) {
      window.xbotDriver.evalService = evalService;
    }
  }
}

/**
 * 本地主机服务类
 * 功能：与本地RPA应用进行通信，处理消息传递
 */
class NativeHost {
  /**
   * 构造函数
   */
  constructor() {
    // 实现细节
  }

  /**
   * 启动本地主机连接
   * @param {Function} callback - 消息回调函数
   */
  async Start(callback) {
    // 实现细节
  }

  /**
   * 获取桥接接口版本
   * @returns {string} 桥接接口版本
   */
  GetBridgeInterfaceVersion() {
    // 实现细节
    return "1.0.0";
  }

  /**
   * 发送消息到本地主机
   * @param {Object} message - 消息对象
   */
  PostMessage(message) {
    // 实现细节
  }

  /**
   * 发送响应到本地主机
   * @param {Object} response - 响应对象
   */
  Response(response) {
    // 实现细节
  }
}

/**
 * 脚本执行服务类
 * 功能：执行脚本代码，提供脚本执行环境
 */
class EvalService {
  /**
   * 构造函数
   * @param {number} tabId - 标签页ID
   */
  constructor(tabId) {
    this.tabId = tabId;
    // 实现细节
  }
}

/**
 * 回调映射类
 * 功能：管理回调函数，处理异步消息的回调
 */
class ReturnCallbackMap {
  /**
   * 构造函数
   */
  constructor() {
    this.map = new Map();
    this.counter = 0;
  }

  /**
   * 注册回调函数
   * @param {Function} callback - 回调函数
   * @returns {number} 回调ID
   */
  RegisterReturnCallback(callback) {
    const id = ++this.counter;
    this.map.set(id, callback);
    return id;
  }

  /**
   * 处理回调消息
   * @param {number} requestId - 请求ID
   * @param {Object} params - 回调参数
   */
  HandleReturnCallback(requestId, params) {
    const callback = this.map.get(requestId);
    if (callback) {
      callback(params);
      this.map.delete(requestId);
    }
  }
}

/**
 * 后台页面服务类
 * 功能：管理扩展的后台页面，处理旧版本Chrome的兼容性
 */
class BackgroundpageService {
  /**
   * 打开扩展窗口（如果需要）
   */
  OpenExtensionWindowIfNeeded() {
    // 实现细节
  }
}

/**
 * 处理器模块 - 提供消息处理器的创建和管理
 */

/**
 * 处理器工厂类
 * 功能：创建各种消息处理器
 */
class Factory {
  /**
   * 创建窗口处理器
   * @param {Object} loader - 加载器实例
   * @returns {Object} 窗口处理器对象
   */
  static CreateWindowHandler(loader) {
    // 实现细节
    return {
      /**
       * 初始化窗口处理器
       */
      Init: async () => {
        // 实现细节
      },
      /**
       * 检查是否可以处理消息
       * @param {Object} message - 消息对象
       * @returns {boolean} 是否可以处理消息
       */
      canHandleMessage: (message) => {
        // 实现细节
        return false;
      },
      /**
       * 处理消息
       * @param {Object} message - 消息对象
       */
      handleMessage: (message) => {
        // 实现细节
      }
    };
  }
}

/**
 * 核心加载器模块 - 扩展的核心初始化和管理组件
 */

/**
 * 可移植加载器类
 * 功能：负责扩展的初始化、消息分发和管理
 */
class LoaderPortable {
  /**
   * 构造函数
   * @param {boolean} inServiceWorker - 是否在Service Worker中运行
   */
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

  /**
   * 初始化加载器
   * 功能：连接本地主机、初始化服务、注册消息处理器
   */
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

  /**
   * 启用UIA消息处理
   * 功能：启用UIA消息处理，并处理缓存的第一条UIA消息
   */
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

  /**
   * 检查是否为UIA消息
   * @param {Object} message - 消息对象
   * @returns {boolean} 是否为UIA消息
   */
  IsUiaMessage(message) {
    if (typeof message.method === 'string' && message.method !== 'Window.SetHwnd' && !message.method.startsWith("Bridge.")) {
      return true;
    }
    return false;
  }

  /**
   * 分发消息
   * 功能：根据消息类型分发到不同的处理器
   * @param {Object} message - 消息对象
   */
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

  /**
   * 调用本地主机函数
   * @param {string} method - 方法名
   * @param {Object} params - 参数
   * @param {Function} returnFunc - 回调函数
   */
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

/**
 * 扩展管理器模块 - 管理扩展的生命周期和行为
 */

/**
 * 扩展管理器类
 * 功能：管理扩展的激活、标签页重载、旧版本扩展禁用等
 */
class ExtensionMgr {
  /**
   * 构造函数
   */
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

  /**
   * 记录service_worker的激活时间戳
   * 功能：记录扩展激活的时间戳，用于调试和监控
   */
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

  /**
   * 重载所有标签页
   * 功能：当扩展安装或启用时，重载所有标签页以确保扩展功能正常工作
   */
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

  /**
   * 禁用旧版本扩展
   * 功能：检测并禁用旧版本的影刀扩展，避免冲突
   */
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

/**
 * 主入口
 * 功能：初始化扩展，根据Chrome版本选择不同的初始化方式
 */
const extMgr = new ExtensionMgr();
const chromiumVersion = browserTools.GetChromiumVersion();
logger.Info("[BackgroundServiceWorker] chromiumVersion:", chromiumVersion);

// 根据Chrome版本选择不同的初始化方式
if (chromiumVersion < 114) {
  // 对于旧版本Chrome，使用BackgroundPage模式
  const backgroundPageMgr = new BackgroundpageService();
  backgroundPageMgr.OpenExtensionWindowIfNeeded();
} else {
  // 对于Chrome 114+，使用Service Worker模式
  const loaderPortable = new LoaderPortable(true);
  loaderPortable.Init();
}