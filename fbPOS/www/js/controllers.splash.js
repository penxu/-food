angular.module('controllers.splash', [
    'ionic',
    'pascalprecht.translate',
    'services.localstorage',
    'services.helper',
    'services.api',
    'directives.common',
    'directives.ubeing',
    'services.offline'
])

.controller('splashCtrl', function($scope, $rootScope, $localStorage, $translate, $helper, $ionicLoading, $api, $ionicHistory, $ionicModal, $filter, $ionicPopup, $offline, $timeout, $window, $ionicPopover, $cordovaFileTransfer, SERVER, $sce, ionicDatePicker) {

    /**************************************************
    // initialize view
    **************************************************/

    $rootScope.choosePayment = function(paymentInfo) {
        $rootScope.currentPayment = paymentInfo;
        $rootScope.popOverOperation.popoverBack();
    };

    $rootScope.chooseOrderType = function(orderType) {
        $rootScope.currentOrderType = orderType;
        $rootScope.popOverOperation.popoverBack();
    };




    $scope.init = function() {


        // get app status
        if (ionic.Platform.isIOS()) {
            $rootScope.platform = 'ios';
        } else if (ionic.Platform.isAndroid()) {
            $rootScope.platform = 'android';
        } else if (ionic.Platform.isWindowsPhone()) {
            $rootScope.platform = 'window';
        } else {
            $rootScope.platform = 'web';
        }
        // table 初始化
        $rootScope.currentTable = { id: 0 };
        $rootScope.tableData = $localStorage.get('table_data');
        //searchbar init 
        $rootScope.showSearchBar = false;
        // detect network info
        console.log('1');
        $helper.watchNetwork();
        if ($localStorage.get('offline') == undefined) {
            $localStorage.set('offline', 'online');
        }
        $rootScope.isOffline = $localStorage.get('offline') == 'offline' ? true : false;
        $rootScope.networkResult = !$rootScope.isOffline && $rootScope.networkStatus;
        // TODO: check network availibility
        $rootScope.online = true;

        $rootScope.can_open_history = true;
        // disable back to splash page
        $ionicHistory.nextViewOptions({ disableBack: true });
        console.log('2');
        // initialize app status from server
        if ($localStorage.get('settings') === null) {
            $localStorage.set('settings', {
                token: null,
                locale: 'EN_US',
                print_locale: 'EN_US',
                device_type: '',
                device_token: '',
                warehouse_lock: false,
                warehouse_id: '',
                cloud_lock: false,
                cloud_address: '',
                epson_ip_address: '192.168.200.39',
                epson_port: '8008',
                epson_device_id: 'local_printer',
                printer_type: 'EPSON thermal printer'
            });
        }
        $translate.use($localStorage.get('settings').locale);
        console.log('3');
        // initialize user
        if ($localStorage.get('user') === null) {
            $localStorage.set('user', {
                id: null,
                name: null,
                shop_id: null,
                level: null,
                login: '',
                password: '',
                warehouse_id: '',
                isLogin: false,
                invoice_prefix: ''
            });
        }

        console.log('4');
        if ($localStorage.get('activate') === null) {
            $localStorage.set('activate', {
                status: false,
                path: 'www',
                prefix: '',
                passcode: '',
                shop_icon: ''
            });
        }

        if ($localStorage.get('activate').shop_icon != '' && $localStorage.get('local_icon') == null) {
            console.log('download logo');
            document.addEventListener('deviceready', function() {
                $scope.downloadLogoPic($localStorage.get('activate').shop_icon)
            });
        }
        console.log($localStorage.get('local_icon'));

        /**************************************************
        // switch sandbox
        **************************************************/
        if ($localStorage.get('activate').prefix == '') {
            $rootScope.sandboxCheckbox = false;
        } else {
            $rootScope.sandboxCheckbox = true;
        }
        console.log('check sandbox production :' + $rootScope.sandboxCheckbox);

        console.log('5');
        //get dial code
        if ($localStorage.get('dial') === null) {
            console.log('ready to get dial!!');
            $api.getDialCode({}).then(function(res) {
                console.log(res);
                if (res.status == 'Y') {
                    var dial_list = res.data;
                    $localStorage.set('dial', {
                        dial_list: dial_list,
                    });

                } else {}
            }).catch(function(err) {
                console.log(err);
                $helper.toast(err, 'long', 'bottom');
            });
        }
        console.log('6');
        // display loading indicator
        $ionicLoading.show({
            template: '<ion-spinner icon="lines"></ion-spinner>',
            noBackdrop: true
        });
        console.log('7');
        var activate = $localStorage.get('activate');
        console.log($rootScope.networkResult);
        if ($rootScope.networkResult) {
            if (activate.status) {
                // initial data & api token & auto login
                console.log('before auth');
                var api_auth = function() {
                    $api.auth().then(function(res) {
                        if (res.status == 'Y') {
                            console.log('into auth');
                            var settings = $localStorage.get('settings');
                            settings.token = res.token;
                            $localStorage.set('settings', settings);

                            // auto login if user saved password
                            var user = $localStorage.get('user');
                            if (user.id != null) {
                                console.log('before login');
                                $api.login({
                                    token: settings.token,
                                    locale: settings.locale,
                                    login: user.login,
                                    password: user.password,
                                    device_type: settings.device_type,
                                    device_token: settings.device_token
                                }).then(function(res) {
                                    if (res.status == 'Y') {
                                        // save returned user info
                                        console.log('login success');
                                        console.log(res);
                                        user.level = res.user_level;
                                        user.shop_id = res.shop_id;
                                        user.isLogin = true;
                                        user.name = res.name;
                                        user.invoice_prefix = res.invoice_prefix;
                                        $localStorage.set('user', user);
                                        console.log('set user' + $localStorage.get('user'));

                                        // save returned warehouse list
                                        var warehouse = [];
                                        console.log('generate warehouse');
                                        for (var i = 0; i < res.options.length; i++) {
                                            warehouse.push({
                                                id: res.options[i].warehouse_id,
                                                code: res.options[i].warehouse_code,
                                                name: res.options[i].warehouse_name
                                            });
                                        }
                                        console.log('set warehouse');
                                        $localStorage.set('warehouse', warehouse);
                                        var inventory_warehouse = [];
                                        for (var i = 0; i < res.warehouses.length; i++) {
                                            inventory_warehouse.push({
                                                id: res.warehouses[i].warehouse_id,
                                                code: res.warehouses[i].warehouse_code,
                                                name: res.warehouses[i].warehouse_name
                                            });
                                        }
                                        $localStorage.set('inventory_warehouse', inventory_warehouse);

                                        $ionicLoading.hide();
                                        $rootScope.firstInit();
                                        $helper.judgeUpdate(res.last_update);
                                        $helper.navForth('home', null, 'slide-left-right');
                                    } else {
                                        // auto login failed, mark the user as un-logged
                                        user.isLogin = false;
                                        $localStorage.set('user', user);
                                        $ionicLoading.hide();
                                        $helper.navForth('login', null, 'slide-left-right');
                                    }
                                }).catch(function(err) {
                                    user.isLogin = false;
                                    $localStorage.set('user', user);
                                    $ionicLoading.hide();
                                    $helper.navForth('login', null, 'slide-left-right');
                                    console.log('catch login err');
                                    $helper.toast(err, 'long', 'bottom');
                                });
                            } else {
                                if (user != null) {
                                    // auto login failed, mark the user as un-logged
                                    user.isLogin = false;
                                    $localStorage.set('user', user);
                                }

                                $ionicLoading.hide();
                                $helper.navForth('login', null, 'slide-left-right');
                            }
                        } else {
                            $helper.toast(res.msg, 'short', 'bottom');
                            $ionicLoading.hide();
                            $ionicPopup.alert({
                                template: $filter('translate')('NETWORK_UNSTEADY_RETRY')
                            }).then(function(res) {
                                $ionicLoading.show({
                                    template: '<ion-spinner icon="lines"></ion-spinner>',
                                    noBackdrop: true
                                });
                                api_auth();
                            });
                        }
                    }).catch(function(err) {
                        $helper.toast(err, 'long', 'bottom');
                        $ionicLoading.hide();
                        $ionicPopup.alert({
                            template: $filter('translate')('NETWORK_UNSTEADY_RETRY')
                        }).then(function(res) {
                            $ionicLoading.show({
                                template: '<ion-spinner icon="lines"></ion-spinner>',
                                noBackdrop: true
                            });
                            api_auth();
                        });
                    });
                };
                api_auth();
            } else {
                $ionicLoading.hide();
                $helper.navForth('activate', null, 'slide-left-right');
            }
        } else {
            if (activate.status) {
                var user = $localStorage.get('user');
                console.log('0');
                if (user.id != null) {
                    console.log('1');
                    $ionicLoading.hide();
                    $rootScope.offlineFirstInit();
                    $helper.navForth('home', null, 'slide-left-right');
                } else {
                    console.log('2');
                    if (user != null) {
                        console.log('3');
                        user.isLogin = false;
                        $localStorage.set('user', user);
                    }
                    $ionicLoading.hide();
                    $helper.navForth('login', null, 'slide-left-right');
                    $helper.toast($filter('translate')('NETWORK_CONTINUE'));
                }
            } else {
                console.log('3');
                $ionicLoading.hide();
                $helper.navForth('activate', null, 'slide-left-right');
                $helper.toast($filter('translate')('NETWORK_CONTINUE'));
            }
        }

        console.log($rootScope.networkResult);

    };

    $scope.downloadLogoPic = function(url) {
        var logoTargetPath = $helper.getRootPath() + 'shop_icon.png';
        var options = {};
        var trustHosts = true;
        $cordovaFileTransfer.download(url, logoTargetPath, options, trustHosts)
            .then(function(result) {
                console.log('download logo finish');
                console.log('logo file path:' + logoTargetPath);
                $localStorage.set('local_icon', logoTargetPath);
                // Success!
            }, function(err) {
                // Error
                console.log('download logo error');
            });
    };

    /**************************************************
    // event handlers
    **************************************************/

    /**************************************************
    // finally
    **************************************************/
    $rootScope.firstInit = function() {
        $rootScope.shop_icon = $localStorage.get('activate').shop_icon;
        $rootScope.user_name = $localStorage.get('user').login;
        var settings = $localStorage.get('settings');
        $rootScope.currentLang = settings.locale;
        $rootScope.currentPrintLang = settings.print_locale;
        $rootScope.printerType = settings.printer_type;
        $rootScope.epsonIpAddress = settings.epson_ip_address;
        $rootScope.epsonPort = settings.epson_port;
        $rootScope.epsonDeviceId = settings.epson_device_id;
        console.log($rootScope.epsonIpAddress);
        angular.forEach($localStorage.get('warehouse'), function(val) {
            if ($localStorage.get('user').warehouse_id == val.id) {
                $rootScope.warehouse_name = val.name;
            }
        });

        // switch language
        $rootScope.switchLanguage = function(lang) {
            console.log('firstInit switchLanguage');
            var settings = $localStorage.get('settings');
            if (settings.locale == lang) return;
            settings.locale = lang;
            $localStorage.set('settings', settings);
            $translate.use(lang);
            $rootScope.currentLang = lang;
        };
        // switch print language
        $rootScope.switchPrintLanguage = function(lang) {
            var settings = $localStorage.get('settings');
            settings.print_locale = lang;
            $localStorage.set('settings', settings);
            $rootScope.currentPrintLang = lang;

        };
        // load invoice detail
        $rootScope.popUpSetting = function() {
            console.log('check sandboxCheckbox :' + $rootScope.sandboxCheckbox);
            $rootScope.tableNum = $rootScope.tableData.length;
            $rootScope.hideMenu();
            $rootScope.settingConfig = {
                title: 'SETTINGS',
                back: function() {
                    $rootScope.settingModal.hide();
                    $rootScope.settingModal.remove();
                }
            };
            $rootScope.langs = SERVER.languages;
            $ionicModal.fromTemplateUrl('templates/modal.setting.html', {
                scope: $rootScope,
                animation: 'none'
            }).then(function(modal) {
                $rootScope.settingModal = modal;
                modal.show();
            });

        };
        $rootScope.warehouseCheckbox = $localStorage.get('settings').warehouse_lock;
        $rootScope.warehouseLock = function(value) {
            var settings = $localStorage.get('settings');
            settings.warehouse_lock = value;
            $localStorage.set('settings', settings);
            $rootScope.warehouseCheckbox = value;
            console.log($rootScope.warehouseCheckbox);
        };

        $rootScope.selectWarehouse = function(war_name) {
            if (!$localStorage.get('settings').warehouse_lock) {
                angular.forEach($localStorage.get('warehouse'), function(val) {
                    if (war_name == val.name) {
                        var user = $localStorage.get('user');
                        user.warehouse_id = val.id;
                        $localStorage.set('user', user);
                        var setting = $localStorage.get('settings');
                        setting.warehouse_id = val.id;
                        $localStorage.set('settings', setting);
                        $api.settings({
                            token: $localStorage.get('settings').token,
                            locale: $localStorage.get('settings').locale,
                            warehouse_id: val.id,
                        }).then(function(res) {
                            if (res.status == 'Y') {} else {
                                $helper.toast(res.msg, 'short', 'bottom');
                            }
                        }).catch(function(err) {
                            $helper.toast(err, 'long', 'bottom');
                        });

                    }
                });
                angular.forEach($localStorage.get('warehouse'), function(val) {
                    if ($localStorage.get('user').warehouse_id == val.id) {
                        $rootScope.warehouse_name = val.name;
                    }
                });
                $rootScope.showWarehouseModal.hide();
                $rootScope.showWarehouseModal.remove();
                $rootScope.currentInvoiceId = null;
                $helper.navForth('home', null, 'slide-left-right');
                $rootScope.initCart();
                //移除 modal setting
                $rootScope.settingConfig.back();
            }

        }

        $rootScope.showWarehouse = function() {
            if (!$localStorage.get('settings').warehouse_lock) {
                $rootScope.warehouseList = [];
                angular.forEach($localStorage.get('warehouse'), function(val) {
                    $rootScope.warehouseList.push(val.name);
                });
                $rootScope.warehouseConfig = {
                    title: 'SELECT_WAREHOUSE',
                    back: function() {
                        $rootScope.showWarehouseModal.hide();
                        $rootScope.showWarehouseModal.remove();
                    }
                };
                $ionicModal.fromTemplateUrl('templates/modal.select-warehouse.html', {
                    scope: $rootScope,
                    animation: 'slide-in-up'
                }).then(function(modal) {
                    $rootScope.showWarehouseModal = modal;
                    $rootScope.showWarehouseModal.show();
                });
            }

        }

        $rootScope.showPrinter = function() {

            $rootScope.printerList = [];
            $rootScope.printerList.push('Other');
            $rootScope.printerList.push('EPSON thermal printer');

            $rootScope.printerConfig = {
                title: 'SELECT_PRINTER',
                back: function() {
                    $rootScope.showWarehouseModal.hide();
                    $rootScope.showWarehouseModal.remove();
                }
            };
            $ionicModal.fromTemplateUrl('templates/modal.select-printer.html', {
                scope: $rootScope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $rootScope.showWarehouseModal = modal;
                $rootScope.showWarehouseModal.show();
            });

        }

        $rootScope.changeEpsonIpAddr = function(addr) {
            var settings = $localStorage.get('settings');
            settings.epson_ip_address = addr;
            $localStorage.set('settings', settings);
            $rootScope.epsonIpAddress = addr;
            console.log($rootScope.epsonIpAddress);
        };


        $rootScope.changeEpsonPort = function(addr) {
            var settings = $localStorage.get('settings');
            settings.epson_port = addr;
            $localStorage.set('settings', settings);
            $rootScope.epsonPort = addr;
            console.log($rootScope.epsonPort);
        };


        $rootScope.changeEpsonDeviceId = function(addr) {
            var settings = $localStorage.get('settings');
            settings.epson_device_id = addr;
            $localStorage.set('settings', settings);
            $rootScope.epsonDeviceId = addr;
            console.log($rootScope.epsonDeviceId);
        };

        $rootScope.selectPrinter = function(printer) {

            var settings = $localStorage.get('settings');
            settings.printer_type = printer;
            $localStorage.set('settings', settings);
            $rootScope.printerType = printer;
            console.log($rootScope.printerType);

            $rootScope.showWarehouseModal.hide();
            $rootScope.showWarehouseModal.remove();

        }

        //cloud print  
        $rootScope.cloudPrint = $localStorage.get('settings').cloud_lock;

        $rootScope.switchCloudPrint = function(value) {
            var settings = $localStorage.get('settings');
            settings.cloud_lock = value;
            $localStorage.set('settings', settings);
            $rootScope.cloudPrint = value;
            console.log($rootScope.cloudPrint);
        };

        $rootScope.cloudPrintAddress = $localStorage.get('settings').cloud_address == ' ' ? '' : $localStorage.get('settings').cloud_address;

        $rootScope.changePrintAddr = function(addr) {
            var settings = $localStorage.get('settings');
            settings.cloud_address = addr;
            $localStorage.set('settings', settings);
            $rootScope.cloudPrintAddress = addr;
            console.log($rootScope.cloudPrintAddress);
        };

        $rootScope.logout = function() {
            console.log('log out');
            var user = $localStorage.get('user');
            user.id = null;
            user.isLogin = false;
            $localStorage.set('user', {});
            $helper.showLoading();
            $api.auth().then(function(res) {
                $helper.hideLoading();
                if (res.status == 'Y') {
                    var settings = $localStorage.get('settings');
                    settings.token = res.token;
                    $rootScope.currentInvoiceId = null;
                    $localStorage.set('settings', settings);
                    $rootScope.hideMenu();
                    $helper.navForth('login', null, 'slide-left-right');
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.hideLoading();
                $helper.toast(err, 'long', 'bottom');
            });
        };

        $rootScope.switchSandbox = function(sandbox) {
            // var content = sandbox?'CHANGE_SANDBOX':'CHANGE_PRODUCTION';           
            // $helper.popConfirm($filter('translate')('REMIND'),$filter('translate')(content),function(res){
            //     if(res){
            console.log('into meme~~');
            var activate = $localStorage.get('activate');
            if (sandbox) {
                activate.prefix = 'sandbox.';
            } else {
                activate.prefix = '';
            }
            $localStorage.set('activate', activate);
            $rootScope.sandboxCheckbox = sandbox;
            $rootScope.logout();
            $rootScope.settingModal.hide();
            $rootScope.settingModal.remove();
            $rootScope.initCart();
            // $rootScope.newCart();

            // }else{
            //     $scope.sandboxCheckbox = !$scope.sandboxCheckbox;
            // }
            // });
        };



        /**************************************************
        // switch offline
        **************************************************/


        /**
         * switch offline mode
         */
        $rootScope.switchOffline = function(isOnline) {
            if ((!$rootScope.isOffline && isOnline) || ($rootScope.isOffline && !isOnline)) return;
            var str = isOnline ? 'SWITCH_ONLINE' : 'SWITCH_OFFLINE';
            $ionicPopup.confirm({
                title: $translate.instant('REMIND'),
                template: $filter('translate')(str)
            }).then(function(res) {
                if (res) {
                    var offlineStatus = $localStorage.get('offline');
                    $localStorage.set('offline', isOnline ? 'online' : 'offline');
                    $rootScope.isOffline = !isOnline;
                    $rootScope.networkResult = !$rootScope.isOffline && $rootScope.networkStatus;
                    $helper.judgeUpdate($rootScope.sandboxCheckbox ? $localStorage.get('sandbox_update_time') : $localStorage.get('production_update_time'));
                    console.log('network result : ' + $rootScope.networkResult);
                    $helper.navForth('home', null, 'slide-left-right');
                    // $rootScope.currentInvoiceId = null;
                    $rootScope.initCart();
                    //移除 modal setting
                    $rootScope.settingConfig.back();

                }
            });
        };


        $rootScope.downloadData = function(remindStr) {
            $ionicPopup.confirm({
                title: $translate.instant('REMIND'),
                template: $translate.instant(remindStr),
                buttons: [{
                        text: $translate.instant('CANCEL'),
                        onTap: function(e) {
                            return false;
                        }
                    }, {
                        type: 'button-positive',
                        text: $translate.instant('CONFIRM'),
                        onTap: function(e) {
                            return true;
                        }
                    },

                ]
            }).then(function(res) {
                if (res) {
                    // data
                    $offline.getOfflineData({
                        token: $localStorage.get('settings').token,
                        locale: $localStorage.get('settings').locale,
                        category: 'POS',
                        type: 'SQLite'
                    }).then(function(res) {
                        console.log('deploy data success!!!');

                        //photo
                        $offline.getOfflinePhoto({
                            token: $localStorage.get('settings').token,
                            locale: $localStorage.get('settings').locale,
                        }).then(function(res) {
                            console.log('deploy photos success!!!');
                        }).catch(function(err) {
                            console.log('catch getOfflinePhoto error!!!');
                            $helper.toast(err, 'short', 'bottom');
                        });
                    }).catch(function(err) {
                        console.log('catch get OfflineData error!!!');
                        console.log(err);
                        $helper.toast(err, 'short', 'bottom');
                    });
                }
            });
        };
    };


    $rootScope.offlineFirstInit = function() {
        $rootScope.shop_icon = $localStorage.get('activate').shop_icon;
        $rootScope.user_name = $localStorage.get('user').login;
        $rootScope.currentLang = $localStorage.get('settings').locale;
        $rootScope.currentPrintLang = $localStorage.get('settings').print_locale;
        $rootScope.printerType = $localStorage.get('settings').printer_type;
        $rootScope.epsonIpAddress = $localStorage.get('settings').epson_ip_address;
        $rootScope.epsonPort = $localStorage.get('settings').epson_port;
        $rootScope.epsonDeviceId = $localStorage.get('settings').epson_device_id;
        console.log($rootScope.epsonIpAddress);
        angular.forEach($localStorage.get('warehouse'), function(val) {
            if ($localStorage.get('user').warehouse_id == val.id) {
                $rootScope.warehouse_name = val.name;
            }
        });
        // switch language
        $rootScope.switchLanguage = function(lang) {
            console.log('offlineFirstInit switchLanguage');
            var settings = $localStorage.get('settings');
            settings.locale = lang;
            $localStorage.set('settings', settings);
            $translate.use(lang);
            $rootScope.currentLang = lang;

        };
        // switch print language
        $rootScope.switchPrintLanguage = function(lang) {
            var settings = $localStorage.get('settings');
            settings.print_locale = lang;
            $localStorage.set('settings', settings);
            $rootScope.currentPrintLang = lang;

        };
        // load invoice detail
        $rootScope.popUpSetting = function() {
            $rootScope.tableNum = $rootScope.tableData.length;
            $rootScope.hideMenu();

            $rootScope.settingConfig = {
                title: 'SETTINGS',
                back: function() {
                    $rootScope.popUpModal.hide();
                    $rootScope.popUpModal.remove();
                }
            };

            $ionicModal.fromTemplateUrl('templates/modal.setting.html', {
                scope: $rootScope,
                animation: 'none'
            }).then(function(modal) {
                $rootScope.popUpModal = modal;
                modal.show();
            });

        };
        $rootScope.warehouseCheckbox = $localStorage.get('settings').warehouse_lock;
        $rootScope.warehouseLock = function(value) {
            var settings = $localStorage.get('settings');
            settings.warehouse_lock = value;
            $localStorage.set('settings', settings);
            $rootScope.warehouseCheckbox = value;
            console.log($rootScope.warehouseCheckbox);
        };

        $rootScope.selectWarehouse = function(war_name) {
            if (!$localStorage.get('settings').warehouse_lock) {
                angular.forEach($localStorage.get('warehouse'), function(val) {
                    if (war_name == val.name) {
                        var user = $localStorage.get('user');
                        user.warehouse_id = val.id;
                        $localStorage.set('user', user);
                        var setting = $localStorage.get('settings');
                        setting.warehouse_id = val.id;
                        $localStorage.set('settings', setting);
                        $api.settings({
                            token: $localStorage.get('settings').token,
                            locale: $localStorage.get('settings').locale,
                            warehouse_id: val.id,
                        }).then(function(res) {
                            if (res.status == 'Y') {} else {
                                $helper.toast(res.msg, 'short', 'bottom');
                            }
                        }).catch(function(err) {
                            $helper.toast(err, 'long', 'bottom');
                        });

                    }
                });
                angular.forEach($localStorage.get('warehouse'), function(val) {
                    if ($localStorage.get('user').warehouse_id == val.id) {
                        $rootScope.warehouse_name = val.name;
                    }
                });
                $rootScope.showWarehouseModal.hide();
                $rootScope.showWarehouseModal.remove();
                $rootScope.currentInvoiceId = null;
                $helper.navForth('home', null, 'slide-left-right');
                $rootScope.initCart();
                //移除 modal setting
                $rootScope.settingConfig.back();
            }

        }

        $rootScope.showWarehouse = function() {
            if (!$localStorage.get('settings').warehouse_lock) {
                $rootScope.warehouseList = [];
                angular.forEach($localStorage.get('warehouse'), function(val) {
                    $rootScope.warehouseList.push(val.name);
                });
                $rootScope.warehouseConfig = {
                    title: 'SELECT_WAREHOUSE',
                    back: function() {
                        $rootScope.showWarehouseModal.hide();
                        $rootScope.showWarehouseModal.remove();
                    }
                };
                $ionicModal.fromTemplateUrl('templates/modal.select-warehouse.html', {
                    scope: $rootScope,
                    animation: 'slide-in-up'
                }).then(function(modal) {
                    $rootScope.showWarehouseModal = modal;
                    $rootScope.showWarehouseModal.show();
                });
            }

        }

        $rootScope.showPrinter = function() {

            $rootScope.printerList = [];
            $rootScope.printerList.push('Other');
            $rootScope.printerList.push('EPSON thermal printer');

            $rootScope.printerConfig = {
                title: 'SELECT_PRINTER',
                back: function() {
                    $rootScope.showWarehouseModal.hide();
                    $rootScope.showWarehouseModal.remove();
                }
            };
            $ionicModal.fromTemplateUrl('templates/modal.select-printer.html', {
                scope: $rootScope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $rootScope.showWarehouseModal = modal;
                $rootScope.showWarehouseModal.show();
            });

        }

        $rootScope.changeEpsonIpAddr = function(addr) {
            var settings = $localStorage.get('settings');
            settings.epson_ip_address = addr;
            $localStorage.set('settings', settings);
            $rootScope.epsonIpAddress = addr;
            console.log($rootScope.epsonIpAddress);
        };


        $rootScope.changeEpsonPort = function(addr) {
            var settings = $localStorage.get('settings');
            settings.epson_port = addr;
            $localStorage.set('settings', settings);
            $rootScope.epsonPort = addr;
            console.log($rootScope.epsonPort);
        };


        $rootScope.changeEpsonDeviceId = function(addr) {
            var settings = $localStorage.get('settings');
            settings.epson_device_id = addr;
            $localStorage.set('settings', settings);
            $rootScope.epsonDeviceId = addr;
            console.log($rootScope.epsonDeviceId);
        };

        $rootScope.selectPrinter = function(printer) {

            var settings = $localStorage.get('settings');
            settings.printer_type = printer;
            $localStorage.set('settings', settings);
            $rootScope.printerType = printer;
            console.log($rootScope.printerType);

            $rootScope.showWarehouseModal.hide();
            $rootScope.showWarehouseModal.remove();

        }

        //cloud print  
        $rootScope.cloudPrint = $localStorage.get('settings').cloud_lock;

        $rootScope.switchCloudPrint = function(value) {
            var settings = $localStorage.get('settings');
            settings.cloud_lock = value;
            $localStorage.set('settings', settings);
            $rootScope.cloudPrint = value;
            console.log($rootScope.cloudPrint);
        };

        $rootScope.cloudPrintAddress = $localStorage.get('settings').cloud_address == ' ' ? '' : $localStorage.get('settings').cloud_address;

        $rootScope.changePrintAddr = function(addr) {
            var settings = $localStorage.get('settings');
            settings.cloud_address = addr;
            $localStorage.set('settings', settings);
            $rootScope.cloudPrintAddress = addr;
            console.log($rootScope.cloudPrintAddress);
        };

        $rootScope.logout = function(hideModalFunc) {
            console.log('log out');
            var user = $localStorage.get('user');
            user.id = null;
            user.isLogin = false;
            $localStorage.set('user', {});
            $helper.showLoading();
            $api.auth().then(function(res) {
                $helper.hideLoading();
                if (res.status == 'Y') {
                    var settings = $localStorage.get('settings');
                    settings.token = res.token;
                    $rootScope.currentInvoiceId = null;
                    $localStorage.set('settings', settings);
                    $rootScope.hideMenu();
                    $helper.navForth('login', null, 'slide-left-right');
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.hideLoading();
                $helper.toast(err, 'long', 'bottom');
            });

        };


        /**************************************************
        // switch sandbox
        **************************************************/
        if ($localStorage.get('activate').prefix == '') {
            $rootScope.sandboxCheckbox = false;
        } else {
            $rootScope.sandboxCheckbox = true;
        }
        $rootScope.switchSandbox = function(sandbox) {
            console.log('into meme~~');
            var activate = $localStorage.get('activate');
            if (sandbox) {
                activate.prefix = 'sandbox.';
            } else {
                activate.prefix = '';
            }
            $localStorage.set('activate', activate);
            $rootScope.sandboxCheckbox = sandbox;
            $rootScope.logout();
            $rootScope.settingModal.hide();
            $rootScope.settingModal.remove();
            $rootScope.initCart();
            // $rootScope.newCart();
        };



        /**************************************************
        // switch offline
        **************************************************/


        /**
         * switch offline mode
         */
        $rootScope.switchOffline = function() {
            var str = $rootScope.isOffline ? 'SWITCH_ONLINE' : 'SWITCH_OFFLINE';
            $ionicPopup.confirm({
                title: $translate.instant('REMIND'),
                template: $filter('translate')(str)
            }).then(function(res) {
                if (res) {
                    var offlineStatus = $localStorage.get('offline');
                    $localStorage.set('offline', offlineStatus == 'online' ? 'offline' : 'online');
                    $rootScope.isOffline = !$rootScope.isOffline;
                    $rootScope.networkResult = !$rootScope.isOffline && $rootScope.networkStatus;
                    $helper.judgeUpdate($rootScope.sandboxCheckbox ? $localStorage.get('sandbox_update_time') : $localStorage.get('production_update_time'));
                    console.log('network result : ' + $rootScope.networkResult);
                    $helper.navForth('home', null, 'slide-left-right');
                    $rootScope.initCart();
                    //移除 modal setting
                    $rootScope.settingConfig.back();

                }
            });
        };

        $rootScope.downloadData = function(remindStr) {
            $ionicPopup.confirm({
                title: $translate.instant('REMIND'),
                template: $translate.instant(remindStr)
            }).then(function(res) {
                if (res) {
                    // data
                    $offline.getOfflineData({
                        token: $localStorage.get('settings').token,
                        locale: $localStorage.get('settings').locale,
                        category: 'POS',
                        type: 'SQLite'
                    }).then(function(res) {
                        console.log('deploy data success!!!');
                        //photo
                        $offline.getOfflinePhoto({
                            token: $localStorage.get('settings').token,
                            locale: $localStorage.get('settings').locale,
                        }).then(function(res) {
                            console.log('deploy photos success!!!');
                        }).catch(function(err) {
                            console.log('error!!!');
                            console.log(err);
                            // $helper.toast(err, 'short', 'bottom');
                        });
                    }).catch(function(err) {
                        console.log('error!!!');
                        console.log(err);
                        // $helper.toast(err, 'short', 'bottom');
                    });
                }
            });
        };

    };

    $rootScope.popoverMenu = function($event) {
        $ionicPopover.fromTemplateUrl('templates/popover.setting.html', {
            scope: $rootScope
        }).then(function(popover) {
            $rootScope.menuPopover = popover;
            popover.show($event);
        });
    };

    $rootScope.hideMenu = function() {
        if ($rootScope.menuPopover) {
            $rootScope.menuPopover.hide();
            $rootScope.menuPopover.remove();
        }
    };

    $rootScope.modalCustomerSearchBar = {
        searchHints: $translate.instant('SEARCH_CUSTOMER_HINTS'),
        searchKeyword: '',
        searchFor: function(keyword) {
            console.log('search for');
            $rootScope.loadCustomerList('refresh', keyword);
        },
        back: function() {
            $rootScope.memberModal.hide();
            $rootScope.memberModal.remove();
        },
        scanQR: function() {
            document.addEventListener("deviceready", function() {

                $helper.scan(function(scanData) {
                    if (scanData.cancelled == 0) {
                        $rootScope.loadCustomerList('refresh', scanData.text);
                    }
                });
            }, false);
        }
    };

    $rootScope.popOverOperation = {
        popoverMemberList: function($event) {
            if ($rootScope.isMemberDetail) {
                $rootScope.loadCustomerDetail('init');

            } else {
                $rootScope.loadMenuCustomerList('init');
            }
            $rootScope.menuCustomerSearchBar = {
                searchHints: $translate.instant('SEARCH_CUSTOMER_HINTS'),
                searchKeyword: '',
                searchFor: function(keyword) {
                    $rootScope.isMemberDetail = false;
                    $rootScope.currentMemberId = 0;
                    $rootScope.currentUserId = 0;
                    $localStorage.set('memberProfile', {
                        member_id: ''
                    });
                    $rootScope.loadMenuCustomerList('refresh', keyword);
                },
                back: function() {
                    $rootScope.memberModal.hide();
                    $rootScope.memberModal.remove();
                },
                scanQR: function() {
                    document.addEventListener("deviceready", function() {
                        $helper.scan(function(scanData) {
                            if (scanData.cancelled == 0) {
                                $scope.loadMenuCustomerList('refresh', scanData.text);
                            }
                        });
                    }, false);
                }
            };
            $ionicPopover.fromTemplateUrl('templates/popover.member-list.html', {
                scope: $rootScope
            }).then(function(popover) {
                $rootScope.memberPopover = popover;
                popover.show($event);
            });
        },

        processMemberDetail: function(member) {
            console.log(member);
            $rootScope.isMemberDetail = true;
            $rootScope.currentMemberId = member.member_id;
            $rootScope.memberID = member.member_id;
            $localStorage.set('memberProfile', {
                member_id: member.member_id
            });
            $rootScope.currentMember = member;
            $rootScope.memberDiscountPercent = Number(member.discount) / 100;
            $rootScope.loadCustomerDetail('init');
            console.log("change member id:" + member.member_id);
        },
        memberBack: function() {
            console.log($rootScope.currentUserId);
            $rootScope.isMemberDetail = false;
            $rootScope.currentMemberId = 0;
            $rootScope.currentUserId = 0;
            $localStorage.set('memberProfile', {
                member_id: ''
            });
            $rootScope.currentMember = {};
            $rootScope.memberDiscountPercent = 0;
        },
        popoverBack: function() {
            $rootScope.memberPopover.hide();
            $rootScope.memberPopover.remove();
        }
    };

    $rootScope.customerListOperation = {
        popUpCustomerList: function() {
            $rootScope.hideMenu();
            $rootScope.loadCustomerList('init');
            $rootScope.searchButtonBar = {
                searchHints: $filter('translate')('SEARCH_CUSTOMER_HINTS'),
                searchKeyword: '',
                searchFor: function(keyword) {
                    $rootScope.loadCustomerList('refresh', keyword);
                },
                back: function() {
                    $rootScope.memberModal.hide();
                    $rootScope.memberModal.remove();
                },
                scanQR: function() {
                    document.addEventListener("deviceready", function() {
                        $helper.scan(function(scanData) {
                            if (scanData.cancelled == 0) {
                                $scope.loadCustomerList('refresh', scanData.text);
                            }
                        });
                    }, false);
                }
            };
            $rootScope.proccessMemberDetail = function(memberID) {
                $localStorage.set('memberProfile', {
                    member_id: memberID
                });
                $rootScope.loadModalCustomerDetail('init');
                console.log("change member id:" + memberID);
                $ionicModal.fromTemplateUrl('templates/modal.member-detail.html', {
                    scope: $rootScope
                }).then(function(modal) {
                    $rootScope.memberDetailModal = modal;
                    $rootScope.memberDetailModalBack = function() {
                        $rootScope.memberDetailModal.hide();
                        $rootScope.memberDetailModal.remove();
                    };
                    console.log('ohohohohohoho');
                    modal.show();
                });
            };
            $ionicModal.fromTemplateUrl('templates/modal.member-list.html', {
                scope: $rootScope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $rootScope.memberModal = modal;
                modal.show();
            });
        },
        back: function() {
            $rootScope.memberModal.hide();
            $rootScope.memberModal.remove();
        }
    };

    $rootScope.orderHistoryOperation = {
        popUpOrderHistory: function() {
            $rootScope.hideMenu();
            $rootScope.loadOrderHistory('refresh');
            $rootScope.searchButtonBar = {
                searchHints: $filter('translate')('SEARCH_INVOICE_HINTS'),
                searchKeyword: '',
                searchFor: function(keyword) {
                    $rootScope.loadOrderHistory('refresh', keyword);
                },
                back: function() {
                    $rootScope.historyModal.hide();
                    $rootScope.historyModal.remove();
                },
                scanQR: function() {
                    document.addEventListener("deviceready", function() {
                        $helper.scan(function(scanData) {
                            if (scanData.cancelled == 0) {
                                $scope.loadOrderHistory('refresh', scanData.text);
                            }
                        });
                    }, false);
                }
            };
            $ionicModal.fromTemplateUrl('templates/modal.order-history.html', {
                scope: $rootScope,
                animation: 'none'
            }).then(function(modal) {
                $rootScope.historyModal = modal;
                modal.show();
            });
        },
        back: function() {
            $rootScope.historyModal.hide();
            $rootScope.historyModal.remove();
        }
    };

    $rootScope.pickUpOperation = {
        popUpPickUp: function() {
            $rootScope.hideMenu();
            $rootScope.loadPickUpList('refresh');
            $rootScope.searchButtonBar = {
                searchHints: $filter('translate')('SEARCH_INVOICE_HINTS'),
                searchKeyword: '',
                searchFor: function(keyword) {
                    $rootScope.loadPickUpList('refresh', keyword);
                },
                back: function() {
                    $rootScope.pickUpModal.hide();
                    $rootScope.pickUpModal.remove();
                },
                scanQR: function() {
                    document.addEventListener("deviceready", function() {
                        $helper.scan(function(scanData) {
                            if (scanData.cancelled == 0) {
                                $scope.loadPickUpList('refresh', scanData.text);
                            }
                        });
                    }, false);
                }
            };
            $ionicModal.fromTemplateUrl('templates/modal.pick-up.html', {
                scope: $rootScope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $rootScope.pickUpModal = modal;
                modal.show();
            });
        },
        back: function() {
            $rootScope.pickUpModal.hide();
            $rootScope.pickUpModal.remove();
        }
    };

    $rootScope.loadMenuCustomerList = function(mode, keyword) {
        console.log('load customer list!!!' + mode + ',' + keyword);
        if (mode != 'more' || $rootScope.menuCustomerList == undefined) {
            $scope.menuCustomerLimitFrom = 0;
            $scope.menuCustomerLimit = 20;
            $rootScope.menuCustomerCount = 0;
        } else {
            $scope.menuCustomerLimitFrom += 20;
        }

        $api.getMemberList({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            keyword: keyword != undefined ? keyword : null,
            limit_from: $scope.menuCustomerLimitFrom,
            limit: $scope.menuCustomerLimit
        }).then(function(res) {
            if (mode != 'more' || $rootScope.menuCustomerList == undefined) {
                $rootScope.menuCustomerList = [];
            }
            if (res.status == 'Y') {
                $rootScope.menuCustomerCount = res.member.count;
                for (var i = 0; i < res.member.list.length; i++) {
                    $rootScope.menuCustomerList.push(res.member.list[i]);
                }
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
            if (mode == 'refresh') {
                $rootScope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $rootScope.$broadcast('scroll.infiniteScrollComplete');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
            if (mode == 'refresh') {
                $rootScope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $rootScope.$broadcast('scroll.infiniteScrollComplete');
            }
        });

    };

    $rootScope.loadcartList = function(mode) {
        $scope.cartLimit = 20;
        $rootScope.cartCount = 0;
        $rootScope.cartList = [];
        if (mode != 'more' || $rootScope.cartList == undefined) {
            $scope.cartLimitFrom = 0;
        } else {
            $scope.cartLimitFrom += 20;
        }
        $scope.customerID = 1;
        $scope.customerID = $localStorage.get('memberProfile');
        $scope.status = [5];
        $api.getInvoiceList({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            user_id: $scope.customerID,
            limit_from: $scope.cartLimitFrom,
            limit: $scope.cartLimit,
            status: $scope.status
        }).then(function(res) {
            if (res.status == 'Y') {
                $rootScope.cartCount = res.data.count;
                for (var i = 0; i < res.data.list.length; i++) {
                    $rootScope.cartList.push(res.data.list[i]);
                }
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }
        });
    };

    $rootScope.loadCustomerDetail = function(mode) {

        if (mode != 'more' || $rootScope.cartList == undefined) {
            $scope.cartLimitFrom = 0;
            $scope.cartLimit = 20;
            $rootScope.cartCount = 0;
            $rootScope.cartList = [];
        } else {
            $scope.cartLimitFrom += 20;
        }
        $api.getMemberProfile({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            member_id: $rootScope.currentMemberId
        }).then(function(res) {
            if (res.status == 'Y') {
                $rootScope.customerDetail = res.data;
                $rootScope.currentUserId = res.data.user_id;
                $scope.status = [2, 3, 4, 5];
                $api.getInvoiceList({
                    token: $localStorage.get('settings').token,
                    locale: $localStorage.get('settings').locale,
                    user_id: $rootScope.currentUserId,
                    limit_from: $scope.cartLimitFrom,
                    limit: $scope.cartLimit,
                    status: $scope.status
                }).then(function(res) {
                    if (res.status == 'Y') {
                        $rootScope.cartCount = res.data.count;
                        for (var i = 0; i < res.data.list.length; i++) {
                            $rootScope.cartList.push(res.data.list[i]);
                        }
                    } else {
                        $helper.toast(res.msg, 'short', 'bottom');
                    }
                    if (mode == 'refresh') {
                        $scope.$broadcast('scroll.refreshComplete');
                    }
                    if (mode == 'more') {
                        $scope.$broadcast('scroll.infiniteScrollComplete');
                    }
                }).catch(function(err) {
                    $helper.toast(err, 'long', 'bottom');
                    if (mode == 'refresh') {
                        $scope.$broadcast('scroll.refreshComplete');
                    }
                    if (mode == 'more') {
                        $scope.$broadcast('scroll.infiniteScrollComplete');
                    }
                });
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });
    };

    $rootScope.loadModalCustomerDetail = function(mode) {

        if (mode != 'more' || $rootScope.cartList == undefined) {
            $scope.cartLimitFrom = 0;
            $scope.cartLimit = 20;
            $rootScope.cartCount = 0;
            $rootScope.cartList = [];
        } else {
            $scope.cartLimitFrom += 20;
        }
        $api.getMemberProfile({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            member_id: $localStorage.get('memberProfile')
        }).then(function(res) {
            if (res.status == 'Y') {
                $helper.checkUndefined(res.data);
                $rootScope.customerDetail = res.data;
                $scope.customerID = res.data.user_id;
                $scope.status = [2, 3, 4, 5];
                $api.getInvoiceList({
                    token: $localStorage.get('settings').token,
                    locale: $localStorage.get('settings').locale,
                    user_id: $scope.customerID,
                    limit_from: $scope.cartLimitFrom,
                    limit: $scope.cartLimit,
                    status: $scope.status
                }).then(function(res) {
                    if (res.status == 'Y') {
                        $rootScope.cartCount = res.data.count;
                        for (var i = 0; i < res.data.list.length; i++) {
                            $rootScope.cartList.push(res.data.list[i]);
                        }
                    } else {
                        $helper.toast(res.msg, 'short', 'bottom');
                    }
                    if (mode == 'refresh') {
                        $scope.$broadcast('scroll.refreshComplete');
                    }
                    if (mode == 'more') {
                        $scope.$broadcast('scroll.infiniteScrollComplete');
                    }
                }).catch(function(err) {
                    $helper.toast(err, 'long', 'bottom');
                    if (mode == 'refresh') {
                        $scope.$broadcast('scroll.refreshComplete');
                    }
                    if (mode == 'more') {
                        $scope.$broadcast('scroll.infiniteScrollComplete');
                    }
                });
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });
    };

    $rootScope.loadPickUpList = function(mode, keyword) {
        if (mode != 'more' || $scope.pickUpList == undefined) {
            $scope.pickUpLimitFrom = 0;
            $scope.pickUpLimit = 20;
            $rootScope.pickUpCount = 0;
        } else {
            $scope.pickUpLimitFrom += 20;
        }

        $scope.status = 2;
        $api.getInvoiceList({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            keyword: keyword != undefined ? keyword : null,
            limit_from: $scope.pickUpLimitFrom,
            limit: $scope.pickUpLimit,
            status: $scope.status,
            pick_up_warehouse_id: $localStorage.get('user').warehouse_id
        }).then(function(res) {
            if (res.status == 'Y') {
                if (mode != 'more' || $rootScope.pickUpList == undefined) {
                    $rootScope.pickUpList = [];
                }
                $rootScope.pickUpCount = res.data.count;
                for (var i = 0; i < res.data.list.length; i++) {
                    $rootScope.pickUpList.push(res.data.list[i]);
                }
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
            if (mode == 'refresh') {
                $rootScope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $rootScope.$broadcast('scroll.infiniteScrollComplete');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
            if (mode == 'refresh') {
                $rootScope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $rootScope.$broadcast('scroll.infiniteScrollComplete');
            }
        });

    };

    $rootScope.loadOrderHistory = function(mode, keyword) {
        console.log('mode: ' + mode + ' ,keyword : ' + keyword);
        if ($rootScope.searchButtonBar && !keyword)
            $rootScope.searchButtonBar.searchKeyword = '';
        if (mode != 'more' || $rootScope.orderHistoryList == undefined) {
            $scope.invoiceLimitFrom = 0;
            $scope.invoiceLimit = 20;
            $rootScope.invoiceCount = 0;
        } else {
            $scope.invoiceLimitFrom += 20;
        }
        $scope.status = [5];
        $api.getInvoiceList({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            keyword: keyword != undefined ? keyword : null,
            limit_from: $scope.invoiceLimitFrom,
            limit: $scope.invoiceLimit,

            // warehouse_id: $localStorage.get('user').warehouse_id,
            status: $scope.status
        }).then(function(res) {
            if (res.status == 'Y') {
                if (mode != 'more' || $rootScope.orderHistoryList == undefined) {
                    $rootScope.orderHistoryList = [];
                }
                $rootScope.invoiceCount = res.data.count;
                for (var i = 0; i < res.data.list.length; i++) {
                    $rootScope.orderHistoryList.push(res.data.list[i]);
                }
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
            if (mode == 'refresh') {
                $rootScope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $rootScope.$broadcast('scroll.infiniteScrollComplete');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
            if (mode == 'refresh') {
                $rootScope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $rootScope.$broadcast('scroll.infiniteScrollComplete');
            }
        });

    };

    // load invoice detail
    $rootScope.loadInvoiceDetail = function(ionvice) {
        if (!$rootScope.can_open_history)
            return;
        $rootScope.can_open_history = false;

        $api.getInvoiceDetail({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            invoice_id: ionvice.id,
            calling_type: 'f_b'
        }).then(function(res) {
            if (res.status == 'Y') {
                var logo_img = $localStorage.get('local_icon');
                // if ($rootScope.currentOrderType && $rootScope.currentOrderType.id == 2)
                //     $scope.confirmPayment();
                console.log('1');
                $translate.use($rootScope.currentPrintLang);
                $scope.getImageToBase64AndPrint(logo_img, res.data);
                // $scope.invoiceDetail = res.data;
                // $scope.productDetail = [];
                // for (var i = 0; i < res.data.products.length; i++) {
                //     $scope.productDetail.push(res.data.products[i]);
                //     $scope.productDetail[i].actual_pickup_qty = $scope.productDetail[i].can_pick_qty;
                // }
                console.log(res.data);
            } else {
                $rootScope.can_open_history = true;
                $helper.toast(res.msg, 'short', 'bottom');
            }

        }).catch(function(err) {
            $rootScope.can_open_history = true;
            $helper.toast(err, 'long', 'bottom');
        });

        // $rootScope.printInvoiceId = ionvice.id;
        // $rootScope.pdfUrl = ionvice.pdf;
        // if ($rootScope.platform == 'web') {
        //     $rootScope.pdfUrl = $sce.trustAsResourceUrl(ionvice.pdf);
        // }
        // console.log($rootScope.pdfUrl);
        // $rootScope.viewInvoiceC = {
        //     mode: 'orderHistory',
        //     back: function() {
        //         $scope.processCheckoutModal.hide();
        //         $scope.processCheckoutModal.remove();
        //     }
        // };
        // $ionicModal.fromTemplateUrl('templates/modal.view-invoice.html', {
        //     scope: $rootScope,
        //     animation: 'slide-in-up'
        // }).then(function(modal) {
        //     $scope.processCheckoutModal = modal;
        //     modal.show();
        // });

    };

    $scope.getImageToBase64AndPrint = function(imgUrl, r) {
        var canvas = document.createElement('CANVAS');
        console.log('2');
        var ctx = canvas.getContext('2d');
        console.log('2.2');
        var img = new Image;
        img.crossOrigin = 'Anonymous';
        img.src = imgUrl;
        console.log('2.3');
        console.log(imgUrl);
        console.log(angular.toJson(img));
        img.onload = function() {
            canvas.height = img.height;
            canvas.width = img.width;
            console.log('~1');
            ctx.drawImage(img, 0, 0);
            console.log('~2');
            var dataURL = canvas.toDataURL('image/png');
            console.log('~3');
            // Clean up
            // var baseVal = dataURL.replace('data:image/png;base64,', '');
            console.log(dataURL);

            var products = [];
            var i = 1;

            for (var j = 0; j < r.products.length; j++) {
                var p = r.products[j];
                var options = ',';

                angular.forEach(p.options, function(opt) {});
                for (var i = p.options.length - 1; i >= 0; i--) {
                    if (i < p.options.length - 1)
                        options = options + ',';
                    options = options + p.options[i].title + ':' + p.options[i].options[0];
                }
                if (options.length == 1) {
                    options = '';
                }
                var dis = '';
                console.log('!!!!!~~~~~~~');
                console.log(p.o_price);
                console.log(p.unit_price);
                if ((p.o_price - p.unit_price) / p.o_price == 0) {
                    dis = '- ';
                } else {
                    dis = (p.o_price - p.unit_price) / p.o_price * 100;
                    dis = dis.toFixed(2) + '%';
                }

                products.push({
                    ITEM_NO: i,
                    PRODUCT_CODE: p.code,
                    PRODUCT_NAME: p.name + options,
                    QTY: p.qty,
                    UNIT_PRICE: p.unit_price,
                    DISCOUNT: dis,
                    SUB_TOTAL: '$' + (p.sub_total * (1 - $rootScope.memberDiscountPercent)).toFixed(2)
                });
                i++;
            }

            var charges = [];
            angular.forEach(r.invoice_charges, function(c) {
                var charge_value = '';
                if (c.sign == '+') {
                    if (c.value_type == 'value') {
                        charge_value = '$' + c.value;
                    } else {
                        charge_value = c.value + '%';
                    }
                } else {
                    if (c.value_type == 'value') {
                        charge_value = '($' + c.value + ')';
                    } else {
                        charge_value = '(' + c.value + '%)';
                    }
                }
                charges.push({
                    CHARGE_NAME: c.title_EN_US,
                    CHARGE_VALUE: charge_value,
                    CHARGE_VALUE_TYPE: c.value_type,
                    CHARGE_SIGN: c.sign
                });
            });
            var qr = new QRious({ value: r.invoice_no });
            var invoice_no_qr = qr.toDataURL();
            var currentTime = new Date();

            if ($rootScope.currentUserId == 0) {
                var member_class = $translate.instant('Visitor');
                var customer_detail = '-';
            } else {
                var member_class = r.customer_info.vip_level;
                var customer_detail = r.customer_info.customer_name + '<br /> \
                                    Tel: ' + r.customer_info.customer_country_code + ' ' + r.customer_info.customer_mobile + '<br /> \
                                    Email: ' + r.customer_info.customer_email + '<br />';
            }

            console.log(invoice_no_qr);
            console.log(r.ticket_num);
            console.log(products);
            console.log(charges);
            console.log(r.customer_info);
            console.log(r.pay_method);
            var pay_method = '';
            for (var i = 0; i < $rootScope.choosePaymentList.length; i++) {
                if ($rootScope.choosePaymentList[i].name == r.pay_method) {
                    pay_method = $translate.instant($rootScope.choosePaymentList[i].translateKey);
                }
            }
            // if take away then pay&print
            $offline.invoicePdf({
                size: '80mm', // '80mm',
                type: 'receipt', // 'receipt' or 'order',
                images: {
                    // COMPANY_LOGO: 'data:image/png;base64,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',
                    COMPANY_LOGO: dataURL,
                    INVOICE_QR: invoice_no_qr,
                    SHOP_QR: 'data:image/png;base64,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'
                },
                data: {
                    INVOICE_NO: r.invoice_no,
                    INVOICE_TITLE: $translate.instant('PRINT_RECEIPT'),
                    MEMBER_CLASS: member_class,
                    INVOICE_DATE: r.invoice_date,
                    TICKET_NO: r.ticket_num,
                    TABLE_NUM: r.table_num == 0 ? '-' : r.table_num,
                    CUSTOMER_DETAIL: customer_detail,
                    DELIVERY_ADDRESS: '',
                    SALESMAN: $localStorage.get('user').login,
                    PRODUCT_ITEM: products,
                    CHARGE_ITEM: charges,
                    PAYMENT_METHOD: pay_method,
                    REMARKS: r.table_num == 0 ? $translate.instant('TAKE_AWAY') : $translate.instant('DINE_IN'),
                    ITEM_TOTAL: '$' + Number(r.item_total).toFixed(2),
                    GRAND_TOTAL: '$' + r.grand_total.toFixed(2),
                    CASH_RECEIVED: '$' + (Number(r.payed_amount) > 0 ? Number(r.payed_amount).toFixed(2) : '0.00'),
                    CHANGES: '$' + ((Number(r.payed_amount) - r.grand_total) > 0 ? (Number(r.payed_amount) - r.grand_total).toFixed(2) : '0.00'),
                    SHOP_NAME: $localStorage.get('user').name,
                    SHOP_TEL: '2625 1162',
                    SHOP_EMAIL: 'info@mushroom.hk',
                }

            }).then(function(res) {
                console.log(res);
                $rootScope.isShowPrintFooter = true;
                $rootScope.historyIframeUrl = 'templates/tpl.invoice-pdf.80mm.print.html';
                $scope.css = res.css;
                $scope.body = res.body;
                $rootScope.viewInvoiceC = {
                    iframe: null,
                    innerDoc: null,
                    css: res.css,
                    body: res.body,
                    back: function() {
                        $rootScope.historyIframeModal.hide();
                        $rootScope.historyIframeModal.remove();
                        $translate.use($rootScope.currentLang);
                        $rootScope.can_open_history = true;
                    },
                    print: function() {
                        // if ($rootScope.printBoxModal) {
                        //     $rootScope.printBoxModal.hide();
                        //     $rootScope.printBoxModal.remove();
                        // }
                        $rootScope.isShowPrintFooter = false;
                        $rootScope.viewInvoiceC.iframe.contentWindow.print($localStorage.get('settings').epson_ip_address, $localStorage.get('settings').epson_port, $localStorage.get('settings').epson_device_id);
                    }
                };
                if($rootScope.historyIframeModal){
                    $rootScope.historyIframeModal.remove();
                }
                $ionicModal.fromTemplateUrl('templates/modal.iframe.order.html', {
                    scope: $rootScope,
                    animation: 'none',
                    hardwareBackButtonClose: false
                }).then(function(modal) {
                    $rootScope.historyIframeModal = modal;
                    if (!modal.isShown()) {
                        $timeout(function() {
                            $helper.hideLoading();
                        }, 500);
                        modal.show().then(function() {
                            $rootScope.viewInvoiceC.iframe = document.getElementById('history-iframe-printer');
                            $rootScope.viewInvoiceC.innerDoc = $rootScope.viewInvoiceC.iframe.contentDocument || $rootScope.viewInvoiceC.iframe.contentWindow.document;
                            $rootScope.viewInvoiceC.innerDoc.getElementById('css-wrapper').innerHTML = $rootScope.viewInvoiceC.css;
                            $rootScope.viewInvoiceC.innerDoc.getElementById('html-wrapper').innerHTML = $rootScope.viewInvoiceC.body;
                            /*var iframe = document.getElementById('iframe-printer');
                            var innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                            console.log(innerDoc.getElementById('css-wrapper').innerHTML);
                            innerDoc.getElementById('css-wrapper').innerHTML = res.css;
                            console.log(innerDoc.getElementById('html-wrapper').innerHTML);
                            innerDoc.getElementById('html-wrapper').innerHTML = res.body;
                            iframe.contentWindow.print('192.168.200.39', '8008', 'local_printer');*/

                            // $rootScope.viewInvoiceC.iframe.contentWindow.print($localStorage.get('settings').epson_ip_address, $localStorage.get('settings').epson_port, $localStorage.get('settings').epson_device_id);
                            // $rootScope.viewPrintBox = {
                            //     back: function() {
                            //         $rootScope.printBoxModal.hide();
                            //         $rootScope.printBoxModal.remove();
                            //     }
                            // };
                            // $ionicModal.fromTemplateUrl('templates/modal.confirm-print-box.html', {
                            //     scope: $rootScope,
                            //     animation: 'slide-in-up'
                            // }).then(function(modal) {
                            //     $rootScope.printBoxModal = modal;
                            //     modal.show();
                            // });
                        });
                    }
                });
            }).catch(function(err) {
                alert('fail');
            });
        };

    };

    $rootScope.yyyymmdd = function(dateIn) {
        var yyyy = dateIn.getFullYear();
        var mm = '00' + (dateIn.getMonth() + 1).toString(); // getMonth() is zero-based
        mm = mm.slice(-2);
        var dd = '00' + dateIn.getDate().toString();
        dd = dd.slice(-2);
        var hh = '00' + dateIn.getHours().toString();
        hh = hh.slice(-2);
        var min = '00' + dateIn.getMinutes().toString();
        min = min.slice(-2);
        var ss = '00' + dateIn.getSeconds().toString();
        ss = ss.slice(-2);
        return String(yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + min + ':' + ss); // Leading zeros for mm and dd
    };

    // print invoice
    $rootScope.printHistory = function() {

        if ($rootScope.platform == 'web') {
            window.open($scope.pdfUrl, '_system', 'location=yes');
        } else {
            $api.epsonPrint($rootScope.printInvoiceId);
        }
    };


    $rootScope.reportOperation = {
        dayEndReport: function() {

            var dateObj = new Date();
            month = '' + (dateObj.getMonth() + 1),
                day = '' + dateObj.getDate(),
                year = dateObj.getFullYear();
            if (month.length < 2) month = '0' + month;
            if (day.length < 2) day = '0' + day;
            console.log([year, month, day].join('-'));
            $rootScope.reportDate = [year, month, day].join('-');

            $rootScope.iframeUrl = SERVER.http + 'cms.' + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'report%2Fdaily-sales-report-pos&warehouse_id=' + $localStorage.get('user').warehouse_id + '&date=' + $rootScope.reportDate;
            console.log($rootScope.iframeUrl);
            // if ($rootScope.platform == 'web') {
            $rootScope.iframeUrl = $sce.trustAsResourceUrl($rootScope.iframeUrl);
            // }    
            $rootScope.viewInvoiceC = {
                iframe: null,
                innerDoc: null,
                back: function() {
                    $rootScope.iframeModal.hide();
                    $rootScope.iframeModal.remove();
                }
            };
            // var htmlTemplate = $rootScope.platform == 'web' ? 'templates/modal.iframe.full.html' : 'templates/common.webview.report.html';
            var htmlTemplate = 'templates/modal.iframe.full.html';
            $ionicModal.fromTemplateUrl(htmlTemplate, {
                scope: $rootScope,
                animation: 'none'
            }).then(function(modal) {
                $rootScope.iframeModal = modal;
                modal.show().then(function() {

                });
            });
        },
        popUpDate: function() {
            var isEn = $localStorage.get('settings').locale == 'EN_US';
            var ipObj1 = {

                callback: function(val) { //Mandatory
                    var dateObj = new Date(val);
                    console.log('Return value from the datepicker popup is : ' + val, dateObj);
                    month = '' + (dateObj.getMonth() + 1),
                        day = '' + dateObj.getDate(),
                        year = dateObj.getFullYear();
                    if (month.length < 2) month = '0' + month;
                    if (day.length < 2) day = '0' + day;
                    console.log([year, month, day].join('-'));
                    if ($rootScope.reportDate != [year, month, day].join('-')) {
                        $rootScope.reportDate = [year, month, day].join('-');
                        $rootScope.iframeUrl = SERVER.http + 'cms.' + $localStorage.get('activate').prefix + $localStorage.get('activate').path + SERVER.subdomain + SERVER.apiPath + 'report%2Fdaily-sales-report-pos&warehouse_id=' + $localStorage.get('user').warehouse_id + '&date=' + $rootScope.reportDate;
                        console.log($rootScope.iframeUrl);
                        $rootScope.iframeUrl = $sce.trustAsResourceUrl($rootScope.iframeUrl);
                    }
                },

                currentYear: new Date().getFullYear(),
                inputDate: new Date(),
                mondayFirst: true,
                closeOnSelect: false,
                templateType: 'popup',
                weeksList: isEn ? ["S", "M", "T", "W", "T", "F", "S"] : ["日", "一", "二", "三", "四", "五", "六"],
                monthsList: isEn ? ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"] : ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
                setLabel: $filter('translate')('CONFIRM'),
                todayLabel: $filter('translate')('TODAY'),
                closeLabel: $filter('translate')('CANCEL'),
                from: new Date().setMonth(new Date().getMonth() - 12),
                to: new Date()
            };
            ionicDatePicker.openDatePicker(ipObj1);
        },
        printReport: function() {
            if ($rootScope.platform == 'web') {
                window.open($rootScope.pdfUrl, '_system', 'location=yes');
            } else {
                $api.printDailyReport($localStorage.get('user').warehouse_id, $rootScope.reportDate);
            }
        }
    };







    $rootScope.tableOperation = {
        showOrHide: function(isShow) {
            $rootScope.showTable = isShow;
        },
        generateTableData: function(num) {
            $rootScope.tableData = $localStorage.get('table_data');
            if ($rootScope.tableData == null) {
                $rootScope.tableData = [];
                for (var i = 1; i < num + 1; i++) {
                    $rootScope.tableData.push({ id: i, name: "Table " + i, invoice: [] });
                }
                $localStorage.set('table_data', $rootScope.tableData);
            }

        },
        chooseTable: function(num) {
            if ($rootScope.currentInvoiceId == null) {
                $helper.toast($translate.instant('THIS_CART_IS_EMPTY'), 'short', 'bottom');
            } else if ($rootScope.tableData && $rootScope.tableData.length > num) {
                $rootScope.tableData = $localStorage.get('table_data');
                for (var i = 0; i < $rootScope.tableData[num].invoice; i++) {
                    if ($rootScope.tableData[num].invoice[i] == $rootScope.currentInvoiceId) {
                        $rootScope.showTable = false;
                        return;
                    }
                }
                if ($rootScope.currentTable && $rootScope.currentTable.id != 0) {
                    $rootScope.tableOperation.removeInvoice($rootScope.currentTable.id, $rootScope.currentInvoiceId);
                }
                $rootScope.tableData[num].invoice.push($rootScope.currentInvoiceId);
                $localStorage.set('table_data', $rootScope.tableData);
                $rootScope.currentTable = $rootScope.tableData[num];
                $rootScope.currentOrderType = $rootScope.chooseOrderTypeList[0];
                console.log($rootScope.currentTable);
                $rootScope.setTableNum($rootScope.currentTable.id);
            }
            $rootScope.showTable = false;
        },
        removeInvoice: function(tableId, invoiceId) {
            var tempTableList = $localStorage.get('table_data');
            for (var i = 0; i < tempTableList.length; i++) {
                if (tempTableList[i].id == tableId) {
                    for (var j = 0; j < tempTableList[i].invoice.length; j++) {
                        if (tempTableList[i].invoice[j] == invoiceId) {
                            tempTableList[i].invoice.splice(j, 1);
                            $localStorage.set('table_data', tempTableList);
                            $rootScope.currentTable = { id: 0 };
                            $rootScope.tableData = $localStorage.get('table_data');
                            break;
                        }
                    }
                    break;
                }
            }
        },
        getTableById: function(tableId) {
            if ($localStorage.get('table_data') == null) {
                $rootScope.tableOperation.generateTableData(50);
                return { id: 0 };
            }
            $rootScope.tableData = $localStorage.get('table_data');
            for (var i = 0; i < $rootScope.tableData.length; i++) {
                if ($rootScope.tableData[i].id == tableId) {
                    return $rootScope.tableData[i];
                }
            }
        },
        changeTableNum: function(num) {
            $rootScope.tableData = [];
            for (var i = 1; i < Number(num) + 1; i++) {
                console.log('~');
                $rootScope.tableData.push({ id: i, name: "Table " + i, invoice: [] });
            }
            console.log('length after push : ' + $rootScope.tableData.length);
            $rootScope.tableNum = $rootScope.tableData.length;
            $localStorage.set('table_data', $rootScope.tableData);
            $rootScope.hideTableNumModal();
        },
        popSelectTable: function() {
            $ionicModal.fromTemplateUrl('templates/modal.select-table-num.html', {
                scope: $rootScope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $rootScope.tempTableNum = $rootScope.tableData.length;
                $rootScope.hideTableNumModal = function() {
                    $rootScope.tableModal.hide();
                    $rootScope.tableModal.remove();
                };
                $rootScope.changeTableTemp = function(num) {
                    console.log(num);
                    $rootScope.tempTableNum = num;
                };
                $rootScope.tableModal = modal;
                modal.show();
            });
        }
    };
    $rootScope.tableOperation.generateTableData(50);

    $rootScope.dineIn = function() {
        console.log('....');
        $rootScope.isDineIn = !$rootScope.isDineIn;
    };

    $rootScope.showHideSearchBar = function() {
        $rootScope.showSearchBar = !$rootScope.showSearchBar;
    }

    $scope.$on('$ionicView.loaded', function() {
        $rootScope.isDineIn = true;
    });
    $scope.$on('$ionicView.enter', function() {
        // $timeout($scope.init,1000);
        $scope.init();

    });


});
