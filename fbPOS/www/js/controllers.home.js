angular.module('controllers.home', [
    'ionic',
    'pascalprecht.translate',
    'ngMessages',
    'ngAnimate',
    'services.localstorage',
    'services.helper',
    'services.api',
    'directives.common',
    'directives.ubeing',
    'pdf',
    'ionic-datepicker',
    'luegg.directives',
    'ti-segmented-control'
])



.controller('homeCtrl', function($scope, $rootScope, $offline, $localStorage, $cordovaFileOpener2, $filter, $translate, $helper, $ionicPlatform, $ionicLoading, $api, $ionicPopup, $ionicModal, $ionicScrollDelegate, $sce, ionicDatePicker, $timeout, $ionicPopover, $ionicSlideBoxDelegate, $anchorScroll, $location) {


    /**************************************************
    // initialize view
    **************************************************/
    $scope.scrollCartToBottom = function() {
        $ionicScrollDelegate.$getByHandle('cartlist').scrollBottom();
    };

    $rootScope.$watch('networkResult', function(newValue, oldValue) {
        console.log('watch network init');
        $scope.init();
    });

    $rootScope.$watch('currentLang', function(newValue, oldValue) {
        console.log('language change init');
        $scope.init();
    });

    $rootScope.setPaymentList = function() {
        console.log('into function : ' + $translate.instant('CASH'));
        $rootScope.choosePaymentList = [
            { id: 1, name: 'cash', code: $translate.instant('CASH'), translateKey: 'CASH', image: 'img/2.0icon/icon-pay/cash.png' },
            { id: 2, name: 'aliPay', code: $translate.instant('ALIPAY'), translateKey: 'ALIPAY', image: 'img/2.0icon/icon-pay/cash.png' },
            { id: 3, name: 'amex', code: $translate.instant('AMEX'), translateKey: 'AMEX', image: 'img/2.0icon/icon-pay/cash.png' },
            { id: 4, name: 'android', code: $translate.instant('ANDROID'), translateKey: 'ANDROID', image: 'img/2.0icon/icon-pay/cash.png' },
            { id: 5, name: 'apple', code: $translate.instant('APPLE'), translateKey: 'APPLE', image: 'img/2.0icon/icon-pay/cash.png' },
            { id: 6, name: 'mastercard', code: $translate.instant('MASTER'), translateKey: 'MASTER', image: 'img/2.0icon/icon-pay/cash.png' },
            { id: 7, name: 'Octopussmalllogo', code: $translate.instant('OPMLG'), translateKey: 'OPMLG', image: 'img/2.0icon/icon-pay/cash.png' },
            { id: 8, name: 'paypal', code: $translate.instant('PAYPAL'), translateKey: 'PAYPAL', image: 'img/2.0icon/icon-pay/cash.png' },
            { id: 9, name: 'visa', code: $translate.instant('VISA'), translateKey: 'VISA', image: 'img/2.0icon/icon-pay/cash.png' },
            { id: 10, name: 'wechat', code: $translate.instant('WECHAT'), translateKey: 'WECHAT', image: 'img/2.0icon/icon-pay/cash.png' }
        ];
    };

    // serve 状态数据
    $scope.serveStatus = [
        { id: 0, name: 'Ordered', translateKey: 'ORDERED' },
        { id: 1, name: 'Served', translateKey: 'SERVED' },
        { id: 2, name: 'Preparing', translateKey: 'PREPARING' }
    ];
    $scope.chooseServe = function(item, info) {
        if (info.id == $scope.currentServeStatus.id) return;
        $scope.currentServeStatus = info;
        $scope.cartItem.served = info.id;
        $scope.editCartServe(info.id);
    };

    $scope.editCartServe = function(id) {
        console.log($scope.cartItem);
        var served = [];
        angular.forEach($scope.cart.products, function(product) {
            if (id && product.item_id == $scope.cartItem.item_id) {
                product.served = id;
            }
            served.push({
                item_id: product.item_id,
                served: product.served
            });
        });
        console.log(JSON.stringify(served));
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'serve',
            served_item: JSON.stringify(served),
            invoice_id: $rootScope.currentInvoiceId
        }).then(function(res) {
            if (res.status == 'Y') {
                if (res.payed && res.payed == 'Y' && served.every($scope.checkEveryServed)) {
                    console.log('Take Away All served');
                    if ($scope.popover) {
                        $scope.popover.hide();
                        $scope.popover.remove();
                    }
                    $rootScope.newCart();
                }
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });
    };

    $scope.checkEveryServed = function(serve) {
        return serve.served != 0;
    };

    $scope.checkEveryNotServed = function(serve) {
        return serve.served == 0;
    };

    $rootScope.setOrderType = function() {
        $rootScope.chooseOrderTypeList = [
            { id: 1, name: 'dinein', translateKey: 'DINE_IN', code: $translate.instant('DINE_IN') },
            { id: 2, name: 'takeaway', translateKey: 'TAKE_AWAY', code: $translate.instant('TAKE_AWAY') }
        ];
    };

    $rootScope.setPrintType = function() {
        $rootScope.choosePrintTypeList = [
            { id: 1, name: 'printneworder', translateKey: 'PRINT_NEW_ORDER', code: $translate.instant('PRINT_NEW_ORDER') },
            { id: 2, name: 'printall', translateKey: 'REPRINT', code: $translate.instant('REPRINT') }
        ];
    };

    $scope.loadCategories = function(mode) {
        $rootScope.rootCategory = [];
        $api.getCategory({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale
                //      shop_id: $localStorage.get('settings').shop_id
        }).then(function(res) {
            if (res.status == 'Y') {
                $scope.categories = [];
                for (var i = 0; i < res.data.length; i++) {
                    if (res.data[i].enabled != '0' && res.data[i].product_count != '0')
                        $scope.categories.push(res.data[i]);
                }
                $rootScope.rootCategory = $scope.categories;
                if ($scope.categories.length > 0) {
                    $scope.loadProductList('init', $scope.categories[0].id, null, $scope.categories[0].name);
                }
                // $scope.categories = res.data;
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
        });

    };

    $scope.loadCategory = function(categoryId, categoryName, children) {
        console.log('load category : ');
        console.log(categoryId + ' , ' + categoryName + ' , ' + children);
        $scope.categoriesStack.push($scope.categories);
        $scope.inRootCategory = false;
        $scope.currentCategoryStack.push({ id: categoryId, name: categoryName });
        if (children.length) {
            $scope.categories = children;
            $scope.categories = [];
            for (var i = 0; i < children.length; i++) {
                if (children[i].enabled != '0' && children[i].product_count != '0')
                    $scope.categories.push(children[i]);
            }
        } else {

            $scope.loadProductList('init', categoryId, null);
        }

    };

    $scope.productSortBy = function(orderBy) {
        if ($scope.currentOrderBy == orderBy) return;
        $scope.currentOrderBy = orderBy;
        $scope.loadProductList('refresh', $scope.currentCategory.id, $scope.searchButtonBar.homeSearchKeyword);
    };

    // load product list
    $scope.loadProductList = function(mode, categoryId, keyword, categoryName) {
        if (keyword != null)
            console.log('load product keyword:' + keyword + ', length:' + keyword.length);
        /*if (keyword != null && keyword.length == 0) {
            $helper.toast($translate.instant('SEARCH_PRODUCT_HINTS'), 'short', 'bottom');
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
            return;
        }*/
        if (mode != 'more' && !categoryId && !keyword) {
            $rootScope.homeSearchButtonBar.homeSearchClear();
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
            return;
        }
        if ($rootScope.homeSearchButtonBar && !keyword)
            $rootScope.homeSearchButtonBar.homeSearchKeyword = '';
        if ($scope.cartDisplay == 'max')
            $scope.cartDisplay = 'normal';
        if (categoryName) {
            $scope.categoriesTitle = categoryName;
        }
        if ($rootScope.posting == true) {
            return;
        } else {
            $rootScope.posting = true;
        }
        if (mode != 'more' || $scope.products == undefined) {
            $scope.productLimitFrom = 0;
            $scope.productLimit = 12;
            $scope.productCount = 0;
        } else {
            $scope.productLimitFrom += $scope.productLimit;
            console.log('more');
        }
        if (categoryId) {
            $scope.currentCategory = {};
            $scope.currentCategory.id = categoryId;
        }
        $scope.isSearching = true;
        $api.getProductList({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            category_ids: categoryId != undefined ? [categoryId] : null,
            keyword: (keyword != undefined && keyword != '') ? keyword : null,
            limit_from: $scope.productLimitFrom,
            limit: $scope.productLimit,
            calling_from: 'pos',
            warehouse_id: $localStorage.get('user').warehouse_id,
            order_by: $scope.currentOrderBy == null ? 0 : $scope.currentOrderBy
        }).then(function(res) {
            console.log(res);
            if (mode != 'more' || $scope.products == undefined) {
                $scope.products = [];
            }
            $rootScope.posting = false;
            $scope.isSearching = false;
            console.log('product list data:');
            if (res.status == 'Y') {
                if (res.cart != null) {
                    $scope.cart = res.cart.data;
                    // $scope.calculateCharge();
                    // $scope.cart.temp_grand_total = $scope.cart.grand_total;
                    $scope.productCount = res.data.products.count;
                    for (var i = 0; i < res.data.products.list.length; i++) {
                        $scope.products.push(res.data.products.list[i]);
                    }
                    $scope.loadProductDetail(res.data.products.list[0].id, res.sku_no);
                    $scope.homeSearchButtonBar.homeSearchKeyword = '';
                    // $scope.searchButtonBar.focus();
                } else {
                    $scope.productCount = res.data.products.count;
                    // for (var i = 0; i < res.data.products.list.length; i++) {
                    //     $scope.products.push(res.data.products.list[i]);
                    // }
                    angular.forEach(res.data.products.list, function(product) {
                        product.haveSpec = false;
                        angular.forEach(product.specifications, function(spec) {
                            if (spec.enabled && spec.selectible && spec.options.length) {
                                product.haveSpec = true;
                            }
                        });
                        $scope.products.push(product);
                    });
                    if (keyword == null) {
                        $scope.currentProducts = [];
                        $scope.currentProducts = $scope.products;
                    }
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
            console.log(err);
            $scope.isSearching = false;
            $rootScope.posting = false;
            $helper.toast(err, 'long', 'bottom');
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }
        });

        $scope.salesState = 'product-list';

    };

    // load product detail
    $scope.loadProductDetail = function(productId, sku) {
        $api.getProductDetail({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            product_id: productId
        }).then(function(res) {
            if (res.status == 'Y') {
                $scope.product = res.data;
                $scope.bigPhoto = $scope.product.photos[0];
                // TODO: handle qty & options
                $scope.product.addQty = 1;
                $scope.product.minAddQty = 1;
                $scope.product.addOptions = {};
                $scope.product.presaleQty = res.data.qty;
                if (sku == null) {
                    var i = 0;
                    angular.forEach($scope.product.specifications, function(spec) {
                        if (spec.enabled && spec.selectible && spec.options.length) {
                            console.log(spec);
                            $scope.product.addOptions[i] = {
                                dictionary: spec.dictionary,
                                option: spec.options[0].id
                            };
                        }
                        i++;
                    });
                } else {
                    $scope.decodeSKU(sku);
                }
                $scope.getSKUInfo();
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });

        $scope.salesState = 'product-detail';

    };
    //use sku to find out attribute, opt , id
    $scope.decodeSKU = function(sku) {

        var attribute = sku.split("-");
        var len = attribute.length;
        if ($scope.product == null) {
            $scope.product = {};
            $scope.product.addOptions = {};
        }
        for (var i = 0; i < len - 1; i++) {
            var tokens = attribute[i].split("Y");
            var dict_id = parseInt(tokens[0].split("X")[1], 16);
            var opt_id = parseInt(tokens[1], 16);
            $scope.product.addOptions[i] = {
                dictionary: dict_id,
                option: opt_id
            };
        }
        $scope.product.id = parseInt(attribute[len - 1].split("P")[1], 16);
    };


    // choose sku
    $scope.chooseSKU = function(spec_id, dict_id, opt_id) {

        $scope.product.addOptions[spec_id] = {
            dictionary: dict_id,
            option: opt_id
        };
        console.log($scope.product.addOptions);
        console.log($scope.product.selectSpecifications);
        $scope.getSKUInfo();
    };

    // get sku info
    $scope.getSKUInfo = function() {

        var spec = [];
        angular.forEach($scope.product.addOptions, function(opt) {
            spec.push(opt);
        });

        $api.getSKUInfo({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            invoice_id: $rootScope.currentInvoiceId,
            product_id: $scope.product.id,
            qty: $scope.product.addQty,
            spec: JSON.stringify(spec),
            currency: $scope.product.currency
        }).then(function(res) {
            if (res.status == 'Y') {
                // TODO: handle qty & options
                $scope.product.addQty = 1;
                $scope.product.minAddQty = 1;
                $scope.product.sku_data = res;
                $scope.product.qty = res.local_qty;
                $scope.product.maxAddQty = res.local_qty - ($scope.product.presaleQty < 0 ? $scope.product.presaleQty : 0);
                $scope.product.reserve = res.reserved_amount;
                $scope.product.pending_out = res.local_pending_out;
                $scope.product.price = res.price;
                $scope.product.original_price = res.original_price;
                $scope.product.sku_no = res.sku;
                $scope.product.data = res.data;
                $scope.product.name = res.product_name;
                $scope.product.remarks = res.remarks;
                $scope.loadCart();
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });
    };

    //search customer
    $scope.newCartCustomerSearchEvent = function(customerKeyword) {
        $rootScope.customerKeyword = customerKeyword;
        $scope.newCartModal.hide();
        $scope.newCartModal.remove();
        $helper.navForth('tab.customer', null, 'slide-left-right');
    };

    //search customer
    $scope.checkoutCustomerSearchEvent = function(customerKeyword) {
        console.log('ho~~~~~~~~~', customerKeyword.customerKeyword);
        if (customerKeyword.customerKeyword != null && customerKeyword.customerKeyword != '') {
            $scope.loadCustomerList('init', customerKeyword.customerKeyword);
            $scope.searchMember = {
                mode: 'directSales',
                back: function() {
                    $scope.searchMemberModal.hide();
                    $scope.searchMemberModal.remove();
                }
            };

            $ionicModal.fromTemplateUrl('templates/modal.customer.html', {
                scope: $scope,
                animation: 'none'
            }).then(function(modal) {
                $scope.searchMemberModal = modal;
                modal.show();
            });
        } else {
            $helper.toast($filter('translate')('MISSING_INPUT'), 'short', 'bottom');
        }

    };

    //confirm change member
    $rootScope.setTableNum = function(table_num) {
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'read',
            table_num: table_num,
            invoice_id: $rootScope.currentInvoiceId,
            calling_type: 'f_b'
        }).then(function(res) {
            if (res.status == 'Y') {

                $scope.cart = res.data;
                $scope.cart.temp_grand_total = $scope.cart.grand_total;
                $scope.calculateCharge();
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });
    };

    //confirm change member
    $rootScope.confirmChangeMember = function(user_id) {
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'address',
            user_id: user_id,
            invoice_id: $rootScope.currentInvoiceId,
            calling_type: 'f_b'
        }).then(function(res) {
            if (res.status == 'Y') {

                $scope.cart = res.data;
                $scope.cart.temp_grand_total = $scope.cart.grand_total;
                $scope.calculateCharge();
                $rootScope.currentMemberId = res.data.customer_info.member_id;
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });
    };

    $scope.loadServingList = function(mode, keyword) {
        if (mode != 'more' || $scope.servingList == undefined) {
            $scope.servingLimitFrom = 0;
            $scope.servingLimit = 50;
            $scope.servingCount = 0;
        } else {
            $scope.servingLimitFrom += 50;
        }

        $api.getInvoiceList({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            keyword: keyword != undefined ? keyword : null,
            limit_from: $scope.servingLimitFrom,
            limit: $scope.servingLimit,
            warehouse_id: $localStorage.get('user').warehouse_id,
            status: [0, 2],
            calling_type: 'f_b'
        }).then(function(res) {
            console.log(res);
            if (mode != 'more' || $scope.servingList == undefined) {
                $scope.servingList = [];
            }
            if (res.status == 'Y') {
                $scope.servingCount = res.data.count;
                for (var i = 0; i < res.data.list.length; i++) {
                    $scope.servingList.push(res.data.list[i]);
                }
            } else {
                // $helper.toast(res.msg, 'short', 'bottom');
                console.log('load serving list err: ' + res.msg);
            }
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }
        }).catch(function(err) {
            console.log('load serving list err: ' + err);
            // $helper.toast(err, 'long', 'bottom');
            if (mode == 'refresh') {
                $scope.$broadcast('scroll.refreshComplete');
            }
            if (mode == 'more') {
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }
        });

    };

    // load cart
    $scope.loadCart = function() {

        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'read',
            invoice_id: $rootScope.currentInvoiceId,
            calling_type: 'f_b'
        }).then(function(res) {
            if (res.status == 'Y') {
                console.log(res);
                $scope.cart = res.data;
                if ($scope.cart.table_num == 0) {
                    $rootScope.currentOrderType = { id: 2, name: 'takeaway', translateKey: 'TAKE_AWAY', code: $translate.instant('TAKE_AWAY') };
                } else {
                    $rootScope.currentOrderType = { id: 1, name: 'dinein', translateKey: 'DINE_IN', code: $translate.instant('DINE_IN') };
                    $rootScope.currentTable = $rootScope.tableOperation.getTableById($scope.cart.table_num);
                }

                angular.forEach($rootScope.choosePaymentList, function(choosePayment) {
                    if (choosePayment.name == $scope.cart.pay_method) {
                        $rootScope.currentPayment = choosePayment;
                    }
                });
                //check o_price null 
                for (var i = 0; i < $scope.cart.products.length; i++) {
                    var oPrice = $scope.cart.products[i].o_price;
                    if (oPrice == null || oPrice == '') {
                        $scope.cart.products[i].o_price = $scope.cart.products[i].unit_price;
                    }
                }
                $scope.cart.temp_grand_total = $scope.cart.grand_total;
                $scope.calculateCharge();
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
                // $helper.navForth('tab.sales-saved', { saveCart: true }, 'slide-left-right');

            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
            // $helper.navForth('tab.sales-saved', { saveCart: true }, 'slide-left-right');
        });

    };

    $scope.loadServingCart = function(invoiceId) {
        $rootScope.currentPayment = { id: 1, name: 'cash', code: $translate.instant('CASH'), translateKey: 'CASH' };
        $rootScope.currentInvoiceId = invoiceId;
        $scope.isNewOrder = true;
        $scope.loadCart();

    };


    //load pending out
    $scope.showPOut = function(sku) {

        $scope.viewPOut = {
            back: function() {
                $scope.POutModal.hide();
                $scope.POutModal.remove();
            }
        };
        $scope.loadOutList('init', null, sku);
        $ionicModal.fromTemplateUrl('templates/modal.pending-out.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.POutModal = modal;
            modal.show();
        });
    };

    //load pending out list
    $scope.loadOutList = function(mode, keyword, sku) {

        if (mode != 'more' || $scope.outList == undefined) {
            $scope.outLimitFrom = 0;
            $scope.outLimit = 20;
            $scope.outCount = 0;
            $scope.outList = [];
        } else {
            $scope.outLimitFrom += 20;
        }
        $api.getStockoutRecord({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            limit_from: $scope.outLimitFrom,
            limit: $scope.outLimit,
            warehouse_id: $localStorage.get('user').warehouse_id,
            sku_no: sku
        }).then(function(res) {
            if (res.status == 'Y') {
                $scope.outCount = res.data.count;
                for (var i = 0; i < res.data.length; i++) {
                    $scope.outList.push(res.data[i]);
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

    $scope.stockLookUp = function(sku) {
        if (sku != null) {
            $scope.decodeSKU(sku);
            $scope.getSKUInfo();
        }
        $scope.viewPOut = {
            back: function() {
                $scope.LookupModal.hide();
                $scope.LookupModal.remove();
            }
        };
        //$scope.loadOutList('init',null,sku);
        $ionicModal.fromTemplateUrl('templates/modal.stock-look-up.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.LookupModal = modal;
            modal.show();
        });

    };

    //open reserve box

    $scope.openReserveBox = function(record) {

        $scope.viewReserveBox = {
            back: function() {
                $scope.ReserveBoxModal.hide();
            }
        };
        $scope.reserve = record;
        $scope.reserve.addQty = 1;
        $ionicModal.fromTemplateUrl('templates/modal.reserve-box.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.ReserveBoxModal = modal;
            modal.show();
        });
    }

    // plus add to cart qty
    $scope.plusReserveQty = function() {

        $scope.reserve.addQty++;
        if ($scope.reserve.addQty > $scope.reserve.qty) $scope.reserve.addQty = $scope.reserve.qty;

    };

    // minus add to cart qty
    $scope.minusReserveQty = function() {

        $scope.reserve.addQty--;
        if ($scope.reserve.addQty < 1) $scope.reserve.addQty = 1;

    };

    $scope.confirmReserveItem = function() {
        if ($scope.reserve.addQty == null) {
            $helper.toast($filter('translate')('INVALID_QUANTITY'), 'short', 'bottom');
            return;
        }
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $scope.reserve.warehouse_id,
            action: 'add',
            invoice_id: $rootScope.currentInvoiceId,
            product_id: $scope.product.id,
            qty: $scope.reserve.addQty,
            sku_no: $scope.product.sku_no,
            currency: $scope.product.currency,
            invoice_charges: angular.toJson($scope.cart.invoice_charges),
            calling_type: 'f_b'
        }).then(function(res) {
            if (res.status == 'Y') {
                // TODO: handle qty & options
                $scope.cart = res.data;
                $scope.calculateCharge();
                $scope.loadProductDetail($scope.product.id, $scope.product.sku_no)
                $scope.ReserveBoxModal.hide();
                $scope.ReserveBoxModal.remove();
                $scope.LookupModal.hide();
                $scope.LookupModal.remove();
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });

    }

    $rootScope.initCart = function() {
        $rootScope.isMemberDetail = false;
        $rootScope.currentMemberId = '';
        $rootScope.currentUserId = 0;
        $rootScope.currentMember = {};
        $rootScope.currentInvoiceId = null;
        $scope.cart = { "item_total": 0, "discount_total": 0, "delivery_total": 0, "service_total": 0, "temp_grand_total": 0, "products": [] };
        $rootScope.currentOrderType = { id: 2, name: 'takeaway', translateKey: 'TAKE_AWAY', code: $translate.instant('TAKE_AWAY') };
        $rootScope.currentPayment = { id: 1, name: 'cash', code: $translate.instant('CASH'), translateKey: 'CASH' };
        $scope.setTempTotal($scope.cart.temp_grand_total);
    };

    $rootScope.clearCart = function() {
        console.log('ready call clearCart');
        if ($scope.cart && $scope.cart.products.length > 0) {
            // $helper.toast($translate.instant('CLEAR_CART_SUCCESS'), 'short', 'bottom');
        }
        console.log($rootScope.currentInvoiceId);
        if ($rootScope.currentInvoiceId) {
            $api.setCart({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                warehouse_id: $localStorage.get('user').warehouse_id,
                action: 'empty',
                invoice_id: $rootScope.currentInvoiceId
            }).then(function(res) {
                if (res.status == 'Y') {
                    console.log(res);
                    if ($scope.viewClearBox)
                        $scope.viewClearBox.back();
                    $scope.cart = res.data;
                    $scope.cart.temp_grand_total = $scope.cart.grand_total;
                    $scope.calculateCharge();
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.toast(err, 'long', 'bottom');
            });
        } else {
            $rootScope.newCart();
        }
    }

    $scope.init = function() {
        if ($rootScope.memberDiscountPercent == null) {
            $rootScope.memberDiscountPercent = 0;
        }
        $rootScope.setOrderType();
        $rootScope.setPrintType();
        $rootScope.setPaymentList();
        $scope.showOrderType = false;
        $scope.showOtherCharge = false;
        $scope.showPaymentMethod = false;
        $scope.showPrintType = false;
        $scope.imgList = [
            'data:image/png;base64,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',
            'data:image/png;base64,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',
            'data:image/png;base64,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',
            'data:image/png;base64,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',
            'data:image/png;base64,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',
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAG8AAABvCAYAAADixZ5gAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmtzIENTNui8sowAACAASURBVHic3b35jyzHfeD5iYjMrKyjq4/X/br7nXyPpEiRlCiJoi3Jl6zxjfHseA74mIUXg92dGQwW2H/Bf8ACewxgYGexh43BrHc8luExVrJsS7JoiRJFUjxEiiJFUuTj8c6+u67MOPaHiMzKys7q7kdpdhYbQKOqszIjI77f+N7f+IZwvgEghKBo1WvOuZnPplb9rXp/vQ9rLVLKxj6a+vuPNY677cNaixDiP3kf1bmIAnPHdTKvfZBn6u20yPxRx9EEiLvt48cxjpOevZs+ZPFgvaPiWv23amsCwEnfjwyghrgP0se8cVTnUV+1p+3jxzGO0/RRPHs3fcjigXqH8zorHmxC7ryJ3U0f8/r6IH0ceUYI6nc558AZwIJ1HLkBcGJ6+YOMIzz5I81lZrzU2OZxNxY3f1DW+v+VPlx4RFLvw4abZBXG02eLz4rMKvq823EUcu+DzKUu96KmH6vtODKu/n6cTPkgfdT/F4FqHJ4SrLPI+mp2gHNQ9Mdsf5J54xA4AVIcfe/MmArEudk+nHNIKU+Uq8U47xYeTexeCDEr8+Yhrv77cSy1abBNg6/30SR3j7wn3CMRSI72MfuiWdk3by5ASZHzmdXsXBwOxPR/KeUMRdVbnXM0jeM4WM7Dy1w1rwmYp+lw3jNVnt70TNOKBIsr5BEWUVCWa+4DAUiB8+AN34/KLOfKdRBWcFgMxXsoqBj//Rh4FJ91xeskeFT/ryLwOI5V70M43yoTO8q65g2qSRY19XPaPur3OGdqfdQ009CNrcki29Cfcw5V9GUFiPAMokA1wtnwbvUjz+U4eDTde7d9OOdOVliaOp4nlwqbbR7vtyWQaqvKTuUUznmKCbLLMKv2O+ewOKz1VGmtDd9d+Vkfry0UFQdSCKSIENIhlUJKiZTRDDuXKIQABZ765sjC8j3CU6g45p7j5PpxMK3KvSMs1xjjqiR/GqE7T0Y2/V4XuqdpxnmEGOfQNscYg9a6RJR2U9rySK5oi6FV3+lEsVL9b9KBlRbcdKEJIVBKIYQgUQlSSmLlkRorRRR53a6KpKZ2EteaB7sPAtOSbc5DUh0BxwnWJu2oaZLFfdYJhACDxRhTIqlAmLUWja4+WYChgMZdLwzw1OecLfuZJ5ul9YshiqLwl5AkCUkUo7xGdKTvqVY8XSzF9TqM7gamTddm2OZx2K+6sY6jzhIxNe2rPmAnwBjDJM+Z5BnGeITBlM2VFFX0I8LzBaGJ6Xiqn/Vrde1WhH6ws/OdYXPhutbaXw9UGglJFEW04pROmhJF0QyS/LjK4TbOvQl2p4Fp/foR5J20QuoIbnrRvNWC9PqcNhmj0YgsyzBOzwDWOVciTwRZZHEY57AWtA3UqTV5nnv2qqfyrko55bvxio+Xb9Jrl1Ki4gilFLHyn4mK/O8q2ITW4TDl+BVT2e7CIJMkoddZoBXHpSxv0irrc7xbmDYqLwXbbHq47jQ+SRjPIGr6I9ZZLJDnOYPBgExPPDDV9DZb6cI6/26tNeNJjtaaic7RZooYFZSN+mdV8fDa6awSo7XGFizZGL9Ywid4lb8VKZIkoZUkRJEMstCVJn4JBydx2j/bilMWul3iOA4sbfbekxADR70vdZjW+xDWet5RXzHz1NuTtKCSLVYobZJnHI6G6EkWFAN/vxFmSm1OkOWGPM+Z6KmConDEcUySJKAikiQhEoGCKpZDoeVWF48QHuhN7LT63dpC5jq01mRZRp7naBfMCSlptVq0kohWFCOwKCGRFaPEGt9Pq9Wi2+6RRBGqxtZ/FJg2IXKuqVCnvuNWRdMgnABtLYPRkMF4BEAcSE0Izxqdc+RGk+eG8WSCMQ6UJI5j/ycVcRwjpVcyqtqkf5EB6Ve5xXk7TQqEk94ssX4ByeD+Kv6fu0idLO+zOC+TdU6e52R5jrMWpQSJVKRJiyiSxFLNsGpjDEIouu0O3XYbJeQM8orFUoXlvLDYcZxuLtus3jyDQFypKtfvAy+gvTdDkFvL3sEuWZYhJcSFqi0EGkGm85IlCiFK6kqi2LMpbOM7qk06z26bPg1eRhWf1d+PaxZXUgwEGy4oLnmQs1mmS5i0WymtJEJYMzte52glbXqdDlFVPgAiWLwuOFTrPtdyLA1KYhUvc4OxjeRavnw+QAEy69jauVOyER9yKdRoycF4yHiSo5Si3W4Txy1i5QcphQAsws72XwD/x9GqRnv1/3orfhdClJzCCc8i8zxnNMmYTEa0kxZpmgQqDAqO9XZkHMcsdLslAkWYX3gDDo4Qw2lMCGhwj1U7qH+vt1LGBA+Dw5Ebw/buDsYYWnFSuqEcoB0cDkZoa+h2u3TStpcfTGVTAaSoxm6OWyw/zjazugtOUlM6iqYdjCcTBoMBzjl63S5RJJHWhPl4rpXEKf1er3SmT91+p08HafzeRHknYf2IKhxuNc6xu7/HeDwmTVNUEPhWgDaO/eEIpGBladmr42ZqbxUmwcyqs5XFMUejnadqV9txCsJxfZSqf+XVzjkEFoHyVCgkxloODg7I85xOu01LzVK10Y5uu02n0/Hyt4wfzpoPzh0fWqrj5UcKxpa/B3NgNJmwvbtDmrRJIonEeVcXksPJBOcc/X6fREU4E+w7YUtFpDC6JUdttf9U7Thtr/xfgEGwe7CP1YaFdkpUCX04J8q5RyqqOML97yexx6YxwY8hGFu9nmUZWEeiIrx95VmDtt6IXuh0aUUxWIOSEieEv6cwyikcw16gN0UH/mO3eYu0em1m9Yf7pRQsdHvs7e1hjENFChnCWE7K0qmgVJB9XnMo+6+Pobg+l+qE8Mibx9OPGIV19hPknHOAk+STCUkUBYrySHHO+y6VUrTiBFmJbksxzSmZAs1PDbxXXwiBDlqXmMPyqmOqXis05bo34zi2SQCprPRrnY9AOBtkFiYsLO8UkNIjN4ljIqXQzpLICOyU5Usp0bmFlocaHEXYaZSU6vyieTfM0z5nrjtXUo1z3i6KKiZBcW8kJDYY1SogtgnQTQMEiAobqLby5k2qaQ7zqOak7zANtJaLLiwkr8z4dAwrBAofmZCu8KGqUjmZ9sEM3qry7iSuV59T1HSx+mDdI1EFQsG7HRaERVuInERIbyBLIZBSYG2wvZwlEhHKUSKi7L9yrRxD+epZBnp0ovO1ttkxz2f5TYiuatMAQvprMtCOQOCCk0AIMNYhrCOJ/Rw9jSk/D+twMnCpwlQ5kgjVrGdUv1fHFlUHe9zE503SOYcUEouPtWVGk5L4lefAGkssFVpIxuMxSRQjlJp6RapJRHg0HUWFpIrAo6OVRzS1ctJH7vWy2BOC71cKhbW68h7/KYIJYwL2CnYqhEBYRyGuhfTyYTweoZQikvKoMiI9C6/Dtw7nJvZZsP+6wR6dxjivdlLc45xDSFlSi0ViLOTjjMXeAhaNDM5cKaHdihlnmuF4Qidte0AXA65SmBS4maBq4X+cH1oBn7JnA7YcBZU0zgKExDgDCISQ4LzzoFg2rrQxg9BmClhTwKjqsDeWyWSCyTNaSeLvdlMPiRACnWukmAZ0qVBUFZHVa9XvTUiNmvjsPIRWByMqykbBPq2AUTZhnGekSRTYgvc4SClJkgRjDIfDATq3ZYqDkAEYzpWruwDZEZYiPK1a52buc4BwEicszoBQfkBOWD+wYJI4jLfRMN5EERZr/BhwEqQPPVmrvcwStuxXOBlkWNAYnX+uFcVIvIsvCn7gKpxMMKPi2A8lYir2qvfWkViFfRNBHTEV6tiuIvRIMLYge+uj0kJJMq05OBzSWlpEKIEkwmIQzisrUazItMY6zWickekcjSsdzE4w81ldVHD099lPgROu/PTanv8/oJcygh4o0+tP0pN25Xcn/P1WOKQTGCwyRP6x3haNVcRCO0UJSayEj/E5r5g5O5WNg0nGSGuipDWT51Kl4CoS57HROn6OaJvHCcmmlQFBGyt8kUJwOBoRxzEr/YUQzAyyJfC0JKQVpGnKaJIz1hmTPJ9SdFDJpjL2aFpdVV7Uw0GzMUiLCGywjLEF9X3qYQz9Vn6HqZQtss6s9bG7RHqzp9NukQhRPi8rWrGQfi7jccZgMibXesaHWiKk8n1ea4J5qbA02UzNK2COFiqmf1ZAhmV3cIhUsLzQ85ThpukH3vaSRFKQdjoY2mQ6ZzgZe5PDBkDI2VVXhKaqY6xP8KhW5hdPk7ZWR16136oKXyxMFYK0qYp9ALjAtvUuhWKNOQdCSQ4GI3YPB4xMDnjKdJUxumBuyAaYVts8l1k0z1C9m+alkAmD8QPKnWX3cABAv931vswQHC3Zb9AvIyQqSmhHCQbnA6HWR7tNAXgZgKpCzkiNzQolyzicKHgbIIg9fK1FimiaflhFDoH1VqgXYXFOEilQcUwSq9JOLe8tmE2puYaUDQP7B/scjMbkzmACdQrVnHc6A8saHo7bAhc18dJiAkf4rfCDO7JHAMCGOJh1Xp4ImBjD/nCEc45O2iaNfT6kKLW38m1ljxKIkxgnYpxz5Ma71rQtkpNckdyABJwQKCEwziCdRCrllY/QowxUL+PIU3UACHjMC7wyowJnAYhkhJQQhfxOgaJMhrIOhHeHuRL6/tNYGE4m7A9HDMcjdECQ96cUDj9P8bJqJztXugarMG1CXBUfc9lmEwLrdlm1KaVIkmhWcwoIdMMRuTXoJCWNE+JIloOqLobyXc4LfKREKgfKu3ldYKPTRNsQOxMSaR2KHDeeYMdD7x8tNDUnEUpikSSdLiZKMEIiZfFeP24VEFkC0RU6mYVCZEivQReyWCgZYns5g9GQw/GEXBuM9KgSCM8WjSWJ47BAC2IgII26t6wRH3W8RDCb/9H0YOkWqlFcle0oIei028RKkQd5ooQPp2Q43CRD5xbXcTjrk1iVUrM+xHIDhwpaWRH3cuG+4I6LFVi/w8ABGkXkNIlzfP3//ve8//J36EivIjkhEc5inUJ2uvzEL/4aGx99jLFQs5nbUuBM0DQrc6zLeO/qikMCk+Pw8ID90YDxJCez1mdzQ6lk+VFb4iii3W7PR8wcFjr73QZuFfJJqwOrYxaO57mzngxBO2nRbafsDYazBr0QaBwRIRIdMsOMMbOZX67o0zS/L8g4bLFoCjtRECFheMgzf/Nl9I23aQuDJZrmpAiJiVNWN86z8cAjyLQLzrPrMr+F4BQI2mmZayIFQniHe24N49GYwWjI/uGQSZ6RWQPSpyMJJYMDglK7Ftax0G+TKOlZfeAuQoomgpuLC6/0TeFausfmIXBeYkwdiRZHGinWllfItGEUVH8nvEksnL/HCj9BJRXFhg5jDFYbv38gsF0poopAD56cyuoUsjCevcGOkmzfvsX2/gGLrS7aGb/fp+AQAnKnuHn7FsPhkKSzEGy5Qr23U5FgPatz0iNwMskZjQfsDw4ZjIaM8hyLX5ROeM6lilyUQpkxDkL4p9tKObO0jAq8q0p0xdemJOXjmhCVSHpTa7KljuPDToBxgq29fW5vb5OVHnUReLSg3+2wkCTIwgNfICuYAV6e1BJthCo9KxSsTExNBoskxqAGu/zguWeJ8jGRtZWwjcMiQCh6G+dYufdBbJLikJhgTxZy1Djv6sqyjOE4YzweM84maGPRDqz0zohiHOUCF3YmT6VI7u0kCesry/TbXZQIFFdAvGIK3U3zsLHzM6bhKMtswnNdJviUP9g5OOT2zhaZNWWmMkAnSjjTbROFFStQyEj5LKrCpYSCyg6gcvePncrYAnmFW0xIhwqyUdmp9morYzbOoXFMnCA3nuK1NWTas/FM52Q6Z5Ln5EbjhMQ4iyn8qgE5cVB0pPAL0Dnjg6xC4aRACUeELBG32OmViIOAvMBJjnNON32v3nvsRpMqUuoPzkOsEALrwAD7owF3dnYZZ1mZ4hZJST9N6aUtn7haIExNfYFHUuXC+8qtXNqUVGKtxZnw3fl8GRPMC2Ed2lms85+F7ViltGK7mHHeRtTOR1CNs57VGn+9MAuEEMSBmqWoLDjhiKQiCtTU77Q5e2aVXqs9izghpt4oOQvTeT7l+vcSLvOQV3+wugrq9x7Z0htsGAuMs5zdg30ODg9LD4wUMQudLt3U53rEAqRwFUAEQMmKpz+wuBkt1wQEiJDsakXYXaTDfgKf0q4RHGYT7wBwPiTkFSc99XQ4n29TyGDnHC70V7BW6QK3EJ7dF/JbIkiwLCrBaH+HpaUlLl66hyiahsZmTK0KN5gH03prQnBJOvVYU6MbrGFllCRcvV5MFugkMRtnznD+zDLuYIt2NqBtRmSH2wwPdz2gcVjnU95tAJrvX8wAF+Opqfgr3209YAXWL4Lw51Vrn3hrhSupqVByyu8U1OXnasMiM7gZf2TpphMOnCF2hpbJ6WNojw948atf4o9+/1/RMoZWJFGi4i91zTbyPJhW2WkT4ma0zSbMz+uYOvnO8Gp8rkklxU056CeK73/li/zgey/w05/9O1x64CFs/wwH+ZhWe4EkbSNDqCVG+Wi7sx4hCKTUgEUaIAR+S7XbWqRzPrphLb6kin93bnNGOsdYg5QRWItz4f4SSILMWJ9ZjUNaT+VIgXHe/2OdRSiBcBYhHDGWOM/Idrd56YVneerLf80bzz3LI5/4JKu9dgV+UxW/8LTIOQQwj302Ia70bc7js/VWXDchH1M23CdEEWoJTtiCcJVgc6nLXz73Ta4//y2ufPhh7nnsU1x44BGW18/TWTpD0l0kils4lWCDY7oU2AYIoRpnPUC97PKpBUGfwSIwAjLjGBtDZh0aAVGMsT7Ya4ylCNoiBEZ7+W2cxVkXFoxDWBEWiEEKh3LgJhOy/V1uXn+Xa997iZeeepLbr7+CHA9JcTxw+XxINg7pWS6Mu0DMHJg2KS51wqjf1xiMrbeiQ+MsUsiZXP6m+wpvgERR1kJxgs3zF1jupnD7HW4+c52bP3iBV89f4sKV+9m4eh9nrz7I4sYFOkvLRK0usrWAUzEIBTLBiVAAQE5XrA1pDV72aXJnyLQhM5BbsDLCBXvSiaCUVOKS1trSYeyMDnvzvEYpjIYswxwO2N+6zY1rb/H+m2/w3g9e4+bbb7F/+zqxntCRhjiS2Cji3KWLyDTFr44GPcLjcg7M5sO0ip8CgTPxvHpVhbrqKitblpq0oCl5F6ygQoFSsXnxEhtnzzLav4bKDNlki/y9Me/svM/111+kc/Y8G1fvZ/XCBVqLK3QW1+gsrNDtLRGlHeKkgxMKoRTWUkbicx1ssEJBsT4MFAl8ILhiYlhriQuPGBaEm0YKpMNMJowO9ti9c5tb77/Hjbfe5vq1t7jzzrts37zOeH8XMR6SOEtPOlrS0ZbeHne9HpuXL0OceFZZwrBZKZkHx1kbdz47nUFeFXFNlR0Eszz66DIJbNLNlsgofkzPbnBm8xxb78Z0k5xJpLDKghkiRw7uGAZyiBq+Q+4cuYtARLSSLu3uEt3eEr3FFfpLy7R7iyTdLirpEEUxQiW4SIKTgTLFdOFLpiaFMegsx0zGTEYD9nf32NvZZ+f2LW5ff5/b169z+/q7bG/dZnwwIB8N0VmONRphHW1hUc4SR5BE0IkULWlwSpH0l1hd3/DIE9LLbOdm7Ll5JkG9HWu6BW2+MarQ5FGpvrTJnVZ564wqPH2rhHafs5sX2RaCJBK0Oglxu0ccx1gpyWROywxo6wjlHGSayVizP865NdYcDido49PpiGJknBIlLVSrg4pbREmMVJFXTPC7eYr4YJZljMcZ48GQ4eGAweEho8MDhocD9ERjstzvrbAGgZdxQjtaDloULNYjLEkFkfJzkHjKzaxl5exZFpZW8TQtUJWstzoVNSHyOLlXvVbEJOcGY+cip/J7PRpRyDdXLIR6HzJm8/I9vILyRQGsRqBJ4oS01yfq9ogWOiydXeVwPOLwcMjIDhjlDkeGlBZtLJmZYDITtjt7zTPPc4zznhKrPXfQ2ntHjCk+Hdr6/EqDV4JSPJUiQt0kFagFCMleR+rGRIUpYiVSWo8kKVjdOE97cQmEmG5Hc3Iq90/RjmOt5T1hPHcVjK1+1rOITzQ0pQQt2Lx0Ly5qofNDYqORNvcbE41GOUuqYpaW+iwnKwwPDjncHzDY3We4f8Dh/oDJKCPPLXpifAkQMpw2mMgb1rnJsMpijcEon2qvHWgExjlyATl+e5YN2oPDeZZL+N+BE0HTtCIY7sEd53y0QDiHDGaM9xDFrF+4RLqwVJpSxQKuw2jeZ5NmOQ+ZpZ13mhtP6wloaoW2SZRw5vwl4oVFzM4OkQvGdvCGOGMwOsPkmiSOiKSi005QpkNLQiolWTrB5Dkm1+R5htEtXxUi9xUiTBp5KjQGYzwl5sahjTcRcgfGylBBwru9jJPY4BAoXGFFxQeHRTMNRxXT98D23w2OOE1ZO38eOh180mixaJtttA8C05KRhbycuSGh42yNaWeu8bfG+4UCBHJljcXVDfa2r5E4C8E/aYOR7bTB5DmBoXn2XHpOIJJFGQ5JRIRRjkQKTCRwWqLzCSaKMKbYihxhLUxyS64hMxZtHRowGrRzSOvTI7QD6bynx9unbpoUV0viDeFihPC+3HZvgaX1TUiSGfjMg8cHhalXGwU4O79McdP3emt6cdGq7rbpdQlxyvqFe5hY6Ve49gp/GTlwXn5NWYlDCEW5h69iikCIKAiHdBblNLGzJDYnsTkxmhYGZXJia4iwgdq9EV5uVa5o0CWFCEJmTZGOGGZQcUTLkA1nhKS3ssrS2jqFAl+t3fnjgmn9Odn0wLzO6v624zpvXjWAVFx+4BF0SDCyTpeIE9Zgc002npS7ZaursPq/92UCZa6KwsqYTERMZIuRajOkxQEthjJlpFqM8b8bfHioOrZ5IHAlFsIF6zfVeI5QYFRx5uwmK2c3S227gEVTMLsJ3tWid3U/89FB1Yz0JmA3IWOe+6Y+0KY+EAKBZOPyvbhWF60HYGoLwTqcNtOwCRxBoGO6+oU1KBxjB0PRQneXEEkb0UpJo5TYOl8qZDgi398jP9gjG+xjzQRltXd5haQ3VxrzwWhndqFWd8HMICCKObO+QW/5jOevwrO1YgPMDEVX5lo1x6qwa4IjBJmLLQdy7M7Y4gX1No/C5vVTDtwPjcVzF0kXV7B3tkrgWGshfJqQ31IM2HJ0MVghMSJiomAiYuKVVTbPXWHtnvvpr50jXlhEJilCegVmOBhwuL3F7feu8f7rr/HOa99j551ryGzkAdLAQQpt0Uc5gseo2FsjXOkBk3HK2QuXoNPFhoSn6tyb4HGckd5kAUz7mN577M7Y+t6E47Sk6vUmoVt4BlAKuossr19k7+YPvJvLTBHo1XID1nvxfe6/t6MoKc8DZ2wjTP8sFz7yU1x65HGWzl9BdPtkosXIwcT45N8ittezhvajIzb3drjvnbd45Vt/y/f+9itkN9+iQ1HBwZV4tHZaGXAK2Omf38siiNo91s5dABX5rLnwVEG5dcScBqaNSmR1EE4e3atQR8Zpf2vSkGZU5DAb4QSkPdYvXWHrRYW2OarQNJ0PD+jMF9cpgpmFDCj7khEDLelcvo+Pfe7vsfrgY+TtFQZWMHGKzFqM9UHZSIhQRkswtoKcGNdfY+XDy/z0pavc+9BHefJP/y3vvvw8LT0mEgIhpvJHupAq64r1IwLyvDpjnKDb73P24mWCBegVLKYJTfWt1fPgOA+ms7Av3i9OvzO2iYzrL6p7a6r3ujJhV0CcsH7pXr4nYxwGZzVFImtBeVb75CUhXZkiIYXDyoiDXLD6wMf49D/+L4lWLzMmYmQFeZA1qdUkdgiHN9l7/xrbt27iVER/bYPe6jqjeIGBk9i0z9lP/DS/uHmBL//RH/D2N/6a9uSwNif/XVYXqHWBdYJQksXVs57yCEytyBp3ftZNew3qcK9+FterZcOKsUz7MM07Y49jjU0CuI70JqNUVZJZidpsXr5K1F1AD0fE1oLxKQnGWqT2BeRiWy3zAQ7F0DjWP/RxPvNP/gUsX2JgE3LjcFIjtSY1Y/T2O7z2zNd54W++wI03XmUy3McRIToLrN7/ET7083+XzYcfxyYd9hy0N6/yK7/7z/iqs7z2t39NbIcoWywmKLwuIvi8pJpSoHGCjUv3IJdXgy1LEIrFBtRmeFRhWs0HKuBX/f8ILkJZ5w+8M7bacf33JsSX/SMRKqZ3Zp3e8hrjwzuk2uDsbK1ok+VhX13oT0hyoVi8cA8f/7XfhMVLGKfKonDSwgJjtt96nmc//we88fTXsINdFk0OeLmabe/w7jdvcGdrj3947hLx6nm0VIyNpX1mk8/849/l1u1tdl74JmmRSi8FmKmMK1P3wtSEijh/z1WIEgj3lBZEuaFmPlyryDkOprO4KUt9ncxnC5kz7wXVzuf1M8tmFXF3gcWz58hdUdRtijisQ5eGuh+oRmHbS3z4Jz9L++KHMVEbKyKEM8TO0iXj8I0X+Mv/7X/gjSe/QGd4k74b0iGjZTNaJqeDpoNldXmJ5W6brR++wsH1t4mFYGAcrQtX+anf+C3ydh8rfFJwvd5ZMS0hfCqgarW4cO/9IOOSS9Tn3ASvJnF0HOxnf/d5ojNvm7FpKgiol2w8zjCfJyMLtRskSEWrs8jKuYvkKsHoacaWALDeRWadKYWzForlKw+z9sDHIWljQ7VLgabLiMM3X+CJP/zvOfze1+m5EUoEykHgEGipGBLhuktc+djjtLo9Xnnir3n+z/890WCXWMChE1z82GNc+fhPcCAiX0jAht1IQd6UpgLesZ0uLHHx6n3e8S5sJYY53RNYbhBiPneaB9OZyE25sUbgMPNrYNSRUDUbTtuavDD+fwHtHmvnLkGcoq3XMjHe2yIcmCwHU+SWgEoX2LzvI7B8DoTfKiaBFgZ95xpP/OkfcPt7T9NnROTycg+CFhFDmbIrUnaiRa78xGf58GOPkx0e8P7zT3Pt6Se4+drLxAJvN0YtHv3sVJzhHQAAG/RJREFU57CdPlpUZVDIjmZaEUIjWV7fpLd+bjo5exQ+LoxlnlfqrmFaUaKOKCIn2XKF+t700qpWdNR2CYMXQKvF6uYlkt4i2lJWti1YZ55rTK49sYqYdn+FlY3LoNpYF4KgOBju8/xf/gnvPPtVIjueJjwJgSViLBMOkyXS+z7GZ373v+EXfvefs7S4wrf+6guM3nuDaO8Ob7/8nDfWnWViHJv3PsjqlatoN9X6qlylyDzLNFy57wFIOxTVJGYdErPutyZbrvis2sjNMHVh0YZnkB98Z2xd0FaRe1LzHgtBZ2WN7tIag613K3K1YjLkOUk7xQhFb/EM8dIayCikw1uEGXP9+8/x/a9/iXS0Q+JynBDeSCdGLp5l88qH+bnHPs2Vj34S1V9ld3eXb37pz3jqi39C104YW9i58T56eIha6pILiewtsnnP/Wy99FwYk/XcXk4R4dlZxAMPPwpSha1kTHcyVeBRIvKUcD3OlJj2I+cHY+s5LPXP+uqZXVFFJw4Rqv4UMk+I4M4VMe2lVXqr6xy8OX1nWaXdWEzuo+JWxqQLK9BqA2HTiTVwcIfXn/0aoxtv0LV+P/tQxOTtVTYf/hSXP/0rXHzwo3QSxfW33uC9bz/FD198hmvPf5t0b4vEGcbEOD0BneNs8BzKiMW1sxilMBYwRQiIqb0pJCJJuXT/A+D3QYGwFOlh3qgvgO1t3HmwPB1MK9cAnJiN582z1+ax0XmtRLwodpTWKxMJb6svr7Gyfp7rKiHXE1/7pAjOGkM2npAuCYSMiNIUVAuH9IvBaSY33+btl54lMWOEdOybFmL5HI//0j/g/k/9AnbtMkrFvPL1v+Kv/t0fMrr5Nuxv0dZj/O53gVOSKG0j4xCHcxKHJO30kFGCy0ZleMfP3XMIbQ0LZ9ZYvXhPZbWe3Oa5wu6u2ePdY/Pst6aBTHdsTrVTf7+q9eGNV39BQtplZf0CImphTBZ8kLo89MIYc1RVL1z7Jmf7vTfZv/kufakY6Jj9zga//Jv/kgd+6hexSRs7PODGC8/y3T/+16jXv8sivsi3EQ4rFcY6rGqxcGYdkXYwgXqE8L6wKbVB8O0Fm9ORO7h85T5Y6EPBGj2Lmc3NdM3wm4eweUgt2K/nYMfsjJ13ekm9zdgdtXvnfS+fcQ7iFovr54jbPfL9/alN40KaXhZsPSw6z/DZJ6HpnDvvX8NMDpk4QWfjCp/9J/8t9z7+8+zv7/PUl/6cm6++wNb3n8PeeIu+G2Et5A4EgolzTESE6C5w7r4P4VodD/sQ3ZiMhxidUalNULI2gQ/AXn3wIVAJOIc/bcD7NE9CynGOkfkEQsXF6OVqYxrEiSukskWpKpTL6nj4/QBCRH7lFbnlBd68xw9kzJlzl0gXlhnuvueRZwo/p8+xdNainGMy2IfxELp9ivJF4/1tX/cr7fNzv/5b3PeZX+Jgb59v/Jv/kRf/+k9JdEYiLFZYtBLkUvrdRNohHGQy5twDH+HSwx9nUHgtrEEYzd6t21gdbCnhlZWiup8V0Gp1uO+hRyBO8Nugw/SsKGN+pS5xJDJx9P95fuFZTHpxE0pcTO28JoQVWt8R+0SKaZy/0mRlmGUc0LnpX+ij3FyIYnFtnf7qWYxQHlnM7qHDaCSG0f42en8LMH6RCH9QhQaS5Q3Wrz4IKualZ7/NK098kTWzz7IY0yZDOVM5ndJvhR6h4Mx5Hv+Vv49cXEIHoz8WAjc65MbbPyS2tnCllzk0QvgDrDrLK2xeugKqKAZX3jgDxzpFVY/NqcK06d6jiC2QGEyWGcTOsTHKTl2B0AIfbkpVFePRb80qyFs0IttnNEvk4hmW18+jReTjeqZAnE+386eaGPLBDvu33wU99B2ohLXzlxGtHlq0/PvMiNe/8w1EPkBGgkxFjITC4oidI9aGyFoyp8i6qzz+G/85q488zshMwRAL2Lr2Jnfeet3bkUxttKLlzrFx/hLd5SXKskdUbTRbekPqcC1Zb41t1gml+lxJjeWbvE0p6zfVETfz8oop4MJOIY+74vcGhFdsnrLfIMSdkJC0WT1/CadaZAFxruqgNoZICvRon613XoPDLR+pjhLWrzzI8sX72BllDAYDGB9wcP1tUgyiSK8QwXntwErFgITJ4jl+8u//Jo989pcZqBZaeh9mbC0tNC8/+beY3S1fnqqyvAvxYGXMuXuuknT7wS12eoWkDtN57rLTtMbssaZrrmTqALY8x8fho8m2kHuVZ0tXjpv24fsJyMGzzo0L90LSC1nNhZFucdZgtK8qEWHZeusVBu+8hjATkBHy/H089JlfxMZtH303GXq0T8vlpBY6zpAEpSMnYs+luM37ePy3/zkP/+o/QicpFuN9mMLSlY6tN3/A9775BG2092kivDbpfNaaUBKVtLh49X6i7gIWVf42A9b60Tk1mDaxzqZzZ2fwUHA7URRooBnrR6iOquYzdZQKCGWHZ9Qy7wEJpsJRZaiySVNIzl66Squ3RLZ1y9eACs9Ya9FZTkf4zWJm/w4vf+srPLZxP2rlArQX+fjnfp339jP2tOKCkziVMBEJcTRm7GLGkWKQK8bpAusf/hg/+eu/xcL9j3KoUnJr8M4TS0tY1M5tvvJHf4jd36aDQwsbSk05VCgUkOFoLy1z7p4rkEyL4njYhIpOPulmrhJSjazXkdakOJbPWh8fLNqJZYqbrjmkF2Euh8E+o/1tTK6JWz3iXg/Z7kIUldWApJhWT6oO2FemlYj1cyyfO8+dm9/3aeomR7iYyMbY4N9UwtFWlltvvcxzX/g3fPLv/g4snseduchnf+u/Jj/YhTRC9M9y0DpD5jS5SrHtRfrnrvLpn/kcVx79SfLOIocm8v5UIUFoEgdy9w7f+KP/g+vPfYO2MzjrNc1CyywWrDWOMxsXWVrzDvIiZ2U6t7C4A6eqIqmunFT9mcexz/JasFtcGM9dBWOLJjEwmbD19hs89+TXeOnZJ9nb2WXxzFmuPvAwDzzyKBfvf5DO2nqoUSJxs7rRlPIQPsJw4R7efwZ0bomdC9tc/Q4fYR3OGKSwdCPLuy8+SStOeOjnf4No9SJpu0ucpGT5gJ/7z36bnR8+irQZcW+Zhc2L9M/dCwtL7BnBxPooBTgS4YjRZFs3eOrPP8/LX/sLOvkQIUyIAgCllhkWuVBsXLxMb3VtOv4pyspoxpxa5LPzp5nDzZOdHjfT/MNT7YwtO5cC6TRMRrz14tP8yf/8+7z3+it0U0U+GXPnBy/w6pNf5snVc9z/yCf4xE//LI88/hnis5tlhsCMZHB4bU21uHDvgzxj/R7waYEAMLnB4c9l0E6gsPTEhLef/gqTg10+/OlfoHPlYSZJn0OnuPwTn+PKYz+DzidkDjSSkXFMNOhQdU8KRwtNnA24/ep3+c4X/4xXn3oCNdxFuXBmggT0rDTASaJ2l7WL9xAv+q1cs0VHpjOsFtmryqk6K637NZvgXv5eWxCnKlM84x13jtHWdb76H/6Yd7/3NNnBDlG3zdLSEqu9Plnu2D/Y4vmvfYmXnn2K+x59jJ/91b/Hwz/5KeTCkp+OVNPNl85D6vy9D+Diti9e41x5umRxELAoTA4gdjnS5Vz/7pNs33iPjY98iksfeZzu2iVy2WZiBWORkFmNdl6MKuEj7koYhMnZv/Eu3/3GV3jpia+w/8PXiLMB3ob01SWqp38XzQpJ0umwcekeaHe8pl3occ56qghcw9fM9giX4miYr0khnOeRmuGGToZxiaO+zSMIq8s9q7l17Q3uvPM6lzcXyPqOg6Fma2sLJSRJkpIkKSpukWeHvPrU3/DmSy/w6V/+VX79d/4prfVz4Fyom1koOBFL5y/TWlggy7bDO73iUuxkFXFUWaES4QwtpxndeIMf3HyLt575CmtXH+L8g4+ysH6JXmcRLSKsVFhhycdDRvs73Hr7h/zwxWd48/ln2Xr3h7jxkERPAENhmRWvL3YF+ei5h8VCf4kzG+en9l2RWi0s6Anj2zfYvXObtNVjaX0DuougImQwqXyJymmBcaiYWnNwML2v0H8FZfZYE/8VYpovORuKd+zvHzIej1ldXIBORDezTDJLNp4wHk8YjfYZZxqnQUYJQsKXP/9/sbt/yG//s39Je20T4pSiBJV1AtlfYuPiVXZeu4N2Xu4559MjsiyjHU9PSinGqYQldRqjcybXd3njvTd44YkvoTrLJAvLiFYbIyTjccbu9hZ7t25xuH2LaHhIYnPaxmCNLhPI7dTPQOEEEsHbJZSX28trG5zZ3IAQ4pF4L9DB+2/zxBc+z9Nf/wp3bt1Ga8vC4ir3fvgRPvlTP8uHH/0YnaVlVLvnbcOAiKLedZ1gZtioEDMbNItSlo3B2DofnqE+FbN09hxDq9g6GHBxrU+KYTweMxk58lyR5SmTzDIe5RweDpkc7pC2e7z1wlN8/+mPs/HwJ0iWVvxpV3FM7qDtBBc+9CDvf/8ZtPYAMSZH2ZjJaEzaac8UYq02haAlLZHJ6OT7mO3bTG5kjDPDJNdMMovLcnq5pmMtzoaSHy5U7qvwNOfclOIqr7LOQSvxxQ66PcZ5hpR+e9n2W6/zx//6X3H9lWdZasFiXzEcTji48zovfPFlnv2Lz7N28Qqf/JnP8enP/TLr9z+E7C2U50rMazOILKmPgHiB+r3f+73fq67oqmBtUmaEsyRRzI33rvPiM8+SjYa0O206nTZJ0vJnC0QRsYppJQlpu02sEoaTMTJO2bx0FR21yLIcm098MTcHZjxADLd59cXvkIqcTqxQUYIMpx+nrRTnHDpsoixOSfZ7HCzO5ERGo2xGYiYkLiexY2IzITI5Ks9Rxvk0PjctKKcLMQVYK2aorzAVpPQxRdXu8thn/w7rD3yUMRIpBInTfOuL/4E//l9/n8H1a4z2trA6p9dts9zu0u+0SZVgb+s2Lz//LC88+yxa55zb3CTpdSvutaPeluq18A9FER5r7RR5R24Mq/Co1Q9x2mahu8g7197hh2++w62bO+ztDRlPNDoLO0qtAeuDlpkRTIhZWN1k+ex5XBQHj4RDKl+8Rk8OiZzmxttvMLr9HgtpjJAJKlRSl8pXx9VaY/IJxvi4n7PFBk3QwqcITlBMnAx/irEVjKwkQ5A5ixE+/b1ElpuuaBv+EWGufkMnICM6axt86pd+DbWyTi4kMRDnI775xT9hsn2bJIoYjjW3d0bc2R0yGGZYIUnbHfoLbTqxYLBzi9e//10wmiv3P0jU6fr81Kr/tKhaGK4VFYBlsbMFj5fSSG8q1tm0EhwSIROuPvQRfv13/ilPLJ3htZe+w62tW9zc2QUyYig3HiIULurQPbNOf/0iYwtplpUxQ6UEuJxJnpGrmEsPf5zvv/8DRhp6LYPVOVYrJqMxIioScIpkn+mRpkL4Uo/WhdLhwp9aYp3AhJpmJlS8LQ7A0DPeoyOaeMk6hRAYIVi7fA/p0hLDyYAoSsikIDNjxod7XNxcJR91GQyW2TvM2N0/YG9/yM7OHkkSsby4wMpynwtrq+wNRjz95b/gykOP8tGf/SWIE4SMjqikJfwRM2MqbJeZXUJVijvWeBQg2m0+8pmfZv3yJV598QW+9+wzvHfth+xt3UKPM6zWCCmJWy06/T5LZzdY3LjIwtpZzpy/yNrmOr1+Hyklk2zgD7R3ivTseZK1y+zeuUZqDIkZY40in0x8ADKKcHa6oPzJzCDwO2OFsBiboY3G5BmR1sRGl5SqEGTOa3gKfAX2Gd+rZ6FKeXeYUqHqbhyzfvU+xipG5RNUPkHHitwa9oaHrCy06fRjhoeK/kKHfjdmcDhiNJpwOBxz884BN27vc+bMEhvrZ9BoXnnqSdbOnqOzfp72ygpJnAS8hMpRDbiofp+7J/0IwiqI9T9ISNus3/sh1q/cx8/+wq+wc/sWO3dus7u1zWg49Dt94phWp01/eYXFM6t0F5do9Tq+lmWeMx4Pyz6NUNhWj2jlIjs72+znE4SwRHLit4LlOSaJwfljALwLMbiNTDE+U2qoprQVfQ0VV5F1zhU+VkqFQIQ9eJHwddX84YuKiVL01y+wfP4SGZJ2EbhF0G53WT27wWvf/Bs+eu8FjM3JJiPiSLCyvEDe69Ab5Ywzw3A04c6dHW5ff5/uyip0XmLt4lX6F7dZ2bzA6vpZFvp9v7GmIV5at/9O3BlbVV7qCBaF51xGsJCwvLDI8pWrhV+ppFJ/ogXT/4EsG2PRKBWTJClW5yRJQrt/hsXLD3Dn9jZb++9jyVmwOSLLcEpg4wihIggH2VvnS1Y5ZzHWkWnHWFty62uPZRbGDnIhsBKMFWgBxslQCsQXFShkXYRHYqQ8cmyUIBbXuPSxT7K4fg7VaiHjNnGrRTtpY3XG+tkLfGt3wje/8wrSZiAd7XabbneRpKVI2x3GowmtxJKmK+zvDbhxY5v0zC3ef+caE+nrq8XKn5jS6iQlq6zi4sgRbPMwO4OkY1Ta4tCHcCMOX27f0qCtljdapIoJxwwQWU3cMrR0hl0wXLj/IbIs4/pLkts77zOcDOiIjFYMicqJo6iUmdb6XbRaZ9hck+cGnedk2pBnBmNF2LwpSu3UWlmmGRZxUxlEqZT+rASDxMYx6eoGVz76Ezzwyc+wsHKWVrtLr53SFoKbr7/K01/9K1544qtexktJt9un22/TarXY3drl9u4eF86fZ3W1T2/SZW9vhIjaRItnWFhe4fBwSHcwJM8ytPYy+iR8FO2uz4ydMeBLgVoIDetzFS3+QN86v3ZQnI8npUNF/mBg6Pg+nUPKCBkp7osfo7e0zLVXvsv2O2+wfXCbZDSizYiuNMTCs07hDLi8dKVprcknNmiiDqMdUoddUYZgKviUeuWCxRRsZicinFSYOCFeXObMpXu555GPcfFhX1Yy7S2z0O1hB3t884kv8MxXv8T1N18lVY71pZSF3iJpmpBrx82bW+xsbdPtdrF5xujQMsx8GUkrBEtnV1leXyfp9Uj7fTr9RXpLy8StdmOKSQ0xgRh8a5Rt9fhT3f6bfq9lTFlR8wp4geOsQEhZuoNcUQTcGPJ8Qj4ZM5kMyLMRk9GA0WDIwfZttt5+g5tvvsb2e28y3roJg21ENiIWviSHdNoj0fr0CWt8ZXxrp3acNn7SBhHqcvoNLw4w0p9pG7W6pP1Fzl6+lwsfepD1qx9iceMCcb9Pu9Njsd1l9+Z1vvBv/4BXv/NtknzEmYU27TRCCst4POTg4IDB4YQoiljsduh2u7TaHd67tc2dgUZ1lljaOM/6pausXbiH9UtXOH/1PjbOn2dheQWh4kbkzYguEbapFsirUlr9oep3WThcmfrkvJkiSrWtCcmzC6cqP6cJOTqfoHWOzsZk2ZhJNkKPh0yGAyaDAw62tti98S7b199h+/q7HG7fYTzYRw8PcXmR9axxLmRUh2oMzolwYIVC4w1uEbdQrZSks0B3aZnFtVVWz11g/cIlVjYu0u71ibpd4rRLlLTpJTF65zr/+//03/Huy8+z3E7RuWM4OMBmGc5mJJGgnUb02inddsRCYpGtDkPZZ5wss3Kv97ueWd9kaW2DpdU1FpeXaXV73gxCzZTobIpCzHKyeWomzEWAqCgj07gc0OCbq/4uKv3MmibeV1dssDQmx1pDrifk+SSwwpFPf88y7HjIZHjAaG+P4f4Oo/1dhvs7jA8PGA0GmHziS1oZn/epZIxQkihJabVT0l6fTneBTn+J7vIy3cUlks4CUbuNiFNUq02cpMRxTBy3iKKEtrR8+f/8X/ibP/t39NyEW+++y2Bk6HQ6LHZiup0WrViQtiJaiaSTRHRTgUh6vHxzzGO/+A/57G/9V9BZBooCCVV319HYXl1ZrBNX1FRi/ySlpeycGiudYyuKhn5mo8rFYRIueFO8K0xFLVqpCekQGcbmOO33q+d64v2fOsdqAzbD5Rl5nvms6GAmAOXB8iqKEFGEkjEyilFxjFARKshZGSdIFftCBkqhVDjvSEaQHXCws43UE27dukEkJBc2+nTaMZ1I0E6g3YqIY0Xa7dDpLmCJ+cF729w6BNpLHB6M6LQWkEmL4iyyaivCS/PcY3VERk1JL7MdHl0Fp1Fs5rWT7vEeEx+ziiKf3IOyxFELx9SfWZ5AYjRW+yCrw5R726tjny4Sv5tVoMryIP4QQ1Ue3OG9PnHgGMGjEw4HVlHCjVt3ONdbYLGTkCYRrUTQawk6aUSn0yFpp8ikzd7BmFdef5e3bh2yfPURcpfwzrvvsyoUy2tnUXFrxqVTdT6fFl6nCsZWO6nfNy9wWD/I9jR91FMlpr977bQ4ewhVdRYU1fmClW6PIq46l2n1pGZXoG8ynI9XjEtB1OLShx4l6a2Spo7FbkK7E5G2FGmiiKKYkRHcvD3mxu2bvHv9NgdjR3/9Ektr5xgMRuxt3fFa5cIiKkqqOzem2njNnj6OdUZ1gFZjd00PzIv9NQN9isjj+jgC4LljOvqcEFFAZuEwODKUynjmU3t1XNVWXlMx9330E9z7sU/xyte+wJ07Oe00JpJe4RrnmuHYMM7BiIRWd4HlC+t0V84ik5SJMeThAMeZ8fsLcz1c8+fiZvfn1WtezaOqYlLHsdAmz0D1uXnAqr9rVjP17NT/Vt9m3bxpf94iO9F/W5+zUHQ3LvAb/8W/ACSvPfdtdg92/WYUKZGyRZx2aC936PT7dBaWidKUtL/E0vomK2tnWVpdo7e8RJy2/HsLRaV4F/MW6BzYW+v5TN39NY/q6h3Mu/bj6OO0gJ8np6tAOI6DnHYc3kDM2L32Ni98+yneePkFtm/dYjweAxDHCSqJidI2SbvDwuIyy2trrGyc4+y586yd32RxaRlUa6qp19rdwONEI73+Oe8wxKZtYSd91ttxgz5tH3czjnlt/jiK4J/FTSbs3bnJ1s0b7G7vMAyOeCEEUdqm3enRWejTX1yiu7hEp9claae+z0qliJPGUSC0cadygbzipqYHTzPp01Lgj7OP4xbdBxnHiRRY1lWXOGeQIbnWZVl5EieAC6dxqihBhGCyF7eVmo+IUgTUYX8SDoprpZF+0io4CdgftP2/1cdJrPa441WrfYS7azvuiqTUkMYvpzL6uHYS9zmpnapM8XGKxWmeO06TOqmPpu8n9dHUX33V1ltdqWp6d6mM+X/w0Xp/6LDFb7hxMkTxhWSOcnvsnO4GHnPLFM+QZ0OHTYg5SfM8TR9N7TgZ2dTHaRfbvOeOWwyF5knwkBS5OIKQFh8i4L58/yz8iu/Vvx9lLqc6M7a4+YOy1v//9hEyuQsbs97d1Ir5wOOYJ5vhlDtj6/dU/5qerfczj3rrVZRO6mPeOJoryZ88jrudS51i/JmyePtMNDwnaLw+00dl/MUhjPV7m8YkhDjdztj6/8exw3qrv7y62pqQelwf88ZxkqIxbxzz5nJ6hUGUJ5qclpLr46i7EOvFB4pWRV4x3xMLx837/yREH9fH3SD/RxlH06o9TR8njaNJiftR4FE0WYmJ1vtomstdBWPr91QFbGFAVr/XX1hnGfP6KN4zj23MG0e9Hae5HdfHPNvwyH2OoHV+8D7qv99NH/8PcK4wR0uDU00AAAAASUVORK5CYII=',
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmtzIENTNui8sowAAA+wSURBVHic7Zp5kF11lcc/v3vvu2+5b+nu93pPJ92dTicQCAkGEAMJE0IQFRRkCnRkcEaLGcd1YHBEBxOh3Gp0KJ0SLXXKBROhAMsoKGQgJE4ggWyEQCBk6aTX9PZev/3uv/mj6Z6gRPu10W5r+Fadetu9v98539/5nd855z4hpZT8P4Yy0wrMNN4kYKYVmGm8ScBMKzDTqIiA8qs2PVeOkPmnAtYLzp9Kp4qw58B9/Me311AsZqZ1f0UEOLrNlp4dFFaWGTtZJPPFAl7an9bEZwLbdv07O49+gv6hXezet2laY1REQLw1yqofLeO/7vkBj31jC85bXQY+n6awoYx0/rzpxL6DP+FA75dID/hkBjVa5y6b1jhiOomQZ3v89/e2su2enVxxzRramloJ7ghQ/fEo4VU6iGnpMmWcHH6JB7auxC57dB/0ef+13+Pii26Y1ljTImAC2cE8D37h5/RvHWXNhWupORGnpi1K1a1R9HO06Q77e+H5Dt96sJORHo9EY4F69WY+cOM90x5P+GcgFT62+zgbb3+YRL6Gi9tWEO8yqL0qQeyjYbQGtaKxbNejYDsUbZuS42K5HrY3LlLC/l230PXKThYt+Vu6u37MtdftJpVIURMJEwlUTvoZIQBA+pLtG3fy2Fee4i3nLGdR9SIiLwRJ3hQjenMYEX7jfWG5HpmyyZhpkTMtTNdDSIllmZjFIma5jFU2cR2L3NgeTvZ/jZD+AUKJneROVrF85RdpaqxH00MEVIX2ZBWRQODPT8AEiukSD921id5nBnn7dWsxXo4TS4epvi1K5LIgML7Kg4USI8USedvBcxxKhTxWoYBvlSjmC6QScaqrqojFYxiRKJoeYMNDK7GzjXzkY7/gRw8s5azWz9HUsoL+wWEioRCdC+YzVDTprK0hqk+NhDNOwASOPnec+z/9M+YuaOGSC1di3WcTfmeYwgchXTIpFQtk02kKmQya69BYm6IulSSZTJKIJ1BVFUUAAqSEzVvv5pFN3+TTt28jWT2HL9/Txj9/9GXCkWoc32csX6Crt5clCxeSLpssrk9NSc8/TaQC5l/Yyh1PfIonv/s/PPzjn3HNx65i7Fs5TjpZuhadQEfS3tLM0qXn0lBXRzCgoQoFISCzaxcH77yT9LPPAhC/4m1sadvHZaveQ33DCV548QGkXYURLeF61Xi+RAnoxBI1lByXsuNOWc/pE9C/B3Hgp9D9NGSOgWeDHoVoA9QtRs5fS779nVRfs5C5SY2HvvgI77vzWuQ9cZo6zqPlmgaCgQCaIlCEQAiBAIZ2/Iz9H1lH3eVrGdm+Hadc5pnjT2KHApzT9Cijpcc51mOTqnPJ2SsRMoEr30vJ/QeUoE66ZBJQp57eVL4F8gOILXdCrBF8Dw78FMaOv+GlVrie59o+ygEWUVNM0HNvF9d/8t1k7y3T+u16jCUhoIDlPYXlbqHsPM3zlx2A6ku4YP16tl5xBUjJ1g/GWbhXY27PEH5R8vxFOpG4wqIbghhnB6gyBDHjOgr2OmzP4+z6JNXh0JTMqcwDxk4gtt0N590EO+4BcxguvQWal0G0FqQP2T7o2w8vPkKwZzeXvLyejvf8nMCCSxls6+AXn/k17/q7t3PiE73Uf/+7FFM/Z3isSKbg43o+bsbjpX1b8IXAtG06b/8kb7EO0ZA7SvP738ex73wHU5Mk99l4vzIJb6git1DD8fuIhCAWCU3ZeKjEA6SP2PQhWPIB2P4lWPEhiDsw+hAE54G0YPg+CHVA9GJIXg/dh+CXn8U36in/4wFQ0+x/+D72fbOJNdeuIfv4Efo+82GqmrPUVamEdOj9XI4nN5SJFCRxxnP1MJBcvXrSK46eI7hkxd/T8+jjxGPddPy6DqH8kKFcBxe3z0VTpr4F1HXr16+f0pWHNiFCNfDSRrjyX6DwI+j7MpivgnQg0ACF3eAMQ3EvjD4MTauhZS1i70bKdUfoVe8mE9/OaDpH37YqWs9dTGLrUpJXP4nQXFxXYqclwVqFUkhQdiVFF2pdONjVhdvdTeHIEVbcdBuh5hb2bt5M4mSJplt/wOHeFpa3txKZ4vE3gSl7gLj/vaAocNkt4OwFvwR9X0b6DihhSN6AGPnhaxcHoPkOcAah5mr4xVcpGHv4ZWMYRUBjtcqJe6+El9/LkoYlePHNKJ9ehyd9nBGfsZ+UGTYhLyVIaJFwtM/HP+AS6vdQfMgD5eYQ7/76V+luXcGi9jY6amsqMh4q8ADx2K3QthwSPdB717jLJ/8ais/je2V8tRrM46CEEc23Q34HjD4ISEisgoObGVgQoaNZJRZRaHjbMY5sC1DO1JEcXY4zpGGe/RyOCv5chUDOJ5qVRJF4usAOSPw2BWWxht8ZpfXDN3LVNzbxqpKkOplkyZwGhKi8Cpt6ECwOwcIrYPRfxz/nd44bbyzHzjxPwdSI+gm0mivRBu5FeOnx6wrPQuPfoOU82hpVfF9iuz6eC0vWbWLnxw2CSoiWLTdTip8kv+pB3CB4l2p4KySOK5BjHsYvfRw3SvysNay47rPk9BiHhjNITeW8liaUaRhfGQHSh0QT9HX933e+CbntmF49Jxp+iJZ9inm9NxMKeGgqaCoIux+MWhRb4tgS15c4jsRxJQ4Wi9bdz/5PhVBD7yC14VYygQHyi38zfiK44BGgKrWajtuuZ171pZT1EAeOdDG3pRbLyXJu2zyiQX1axldGgJECpwwLNoJ5ZFysY8jiUUrpfoK9mwh13siA/gRG7gESQY1QbB6ByDzUwPix5JU8LAUcR2I7EssBK1Ck+Y6NbLqjj6BZT/MDZ1P12d0kYpcwt+EqOpuuRtWiDI6M8mx3H6GYxdlnuQyNlIlHwsxLVk/b+MoIqFsMY71Q/BoU950yQiuujJF+5T/Rhl8huvCDBBd+jbHBz6GM3kdoOIQRejdBRVD2BZYjMS2BaQtM08P1ooQa5nLNxiBRtYWWlgtJxtdjOy6ZXI6XjvaTLpaJVmWZ076Z6kgO3/oM3QMnedfFF/7RvZep5wE7v47IH4GFCej76vh3xlI8pZ6h45s5kr+c4eNPIKrWkmpbi9rydqprYuhqN6pyEt8r43oSQQghYmhqirDejBAxLMemUDYplEoUyia5YgkloFFVpWDEdqIqj6KqewipCwirX+DpvRpvXXIuLTVVf6T5lXjA4hvh+xfA8vsh+ADozZBYg9JzF6FILREvgqZCaeRJemWKWM9j0HED+dTbCBrzxlfKdZHSw7YdQOJ4aTQthxEMEQi4BOMD1CS6SImDoDyHEK8A3msKKGjKJRzuqqG2WmVOdQIp5bQi/6moqBYQ2z4P6YOw+hYoHYLedbhWhpJ2EQP5OfQdeph0Dmw/hqx6B6oWIRVsINK4kHTd+bQ2a3Qka9HVCBKJQMX2eik6z1JwfkXR2YEvC284t0Id0trI7v0D3LD2cgKnZHu/TUIlpFTUFZYr140nPY98BdSzkI23I6MX4Qc7CeoqsWgUo+Ys9Np3QKADr+s4mS3foUF3WX3OQvKjgif293E8PYoggCJ0dLWekDafoLoAOF2LXSD9u9nz/AArz1+GCvi+/zqRUjKxlqe+/0OYXkPkxfsQT/4bfuvFuPNXUzZaKLgqY4P9jHW9SPbQTspde2m44DqW3vQVIsk5k7cWSmX2Hz5K1nFY1tlOYyyG449Qdp8ma20iZz/2W0SoOM7tFMeuppjLctmyJa8zcGK1FUUZL6lPkVN/Pz0B/jQ7Qp4JL27Ae/XXWL0vUMqOUA6kcKsXEGhfReqCGwkl55729nyxyL5XDuEIlfPP6iSkCUzvBFnrUYrOBoQYRMo5OM5tuN6l9Bw/xpqlS9BUFc/zJkkQQqAoyqRMfH4jMs4sAWcI2WyWfYcOEYxEWbxgPgD92QKm6wICx/PwpCThWrQ2NuC6Lq7rTrq9EGK8faYok68Toqrq7CdgAkNDQ7x89BgdixaRMCK8OpIBKfDxx5scVTF0TcO2bWzbxnXdyW2gqiqapr3udUImyDgd/mQ9wUpRV1eHYRgcPnyYTF0j1eEQectGQUNIKLs+AVXieR6O42BZFr7vI4RA0zQ8z0PTtN+JD7/PeJhFBAAYhkFnZycHjnXhVKcI6RqKUPCRZItFqsLj5a7rupimieu6qKpKIBDA8zx8//WnyIT7/0V4wAQikQhtDQ30lSx0NYgvJZqikC+VCQQCk6tsWdYkAZ7noevjBdGpgW8iGE5shTfCrPyDRF0qCZ5DIhSE1yKU6TioqkowGETTNCzLwjRNTNOcjAu2beM4Dq7r4nnepFe47unb5LPOAybQlKxBwHjLHEDTME0TXdfRdZ1yufy6fQ9MrvapMnFanA6z0gMAUrEoecumKhxEEQLDMBjNZlEUBdu2J2PAqfJGq+/7Pqp6+ge0s9YDVCGQEqLBAGNlC13XOdTbixkIMVa2UZP1mFYZ33UQnod6SjzwvPECKhgMEg6H/zIJKNoORcdBFQrhgIrrS0zXQdoWCSNMIhpBBYq2Te9oBmlbBKQkGo2SSqUwDGNKRdGsI8CXkhOZHAP5AkiwPZewHsB0PZLJJLue308yEUcVAg+BEgjQUpsi73jEogbzGmorapLMqhjgeD7dYzkURVBrRKjWVXwEQVVDCEEsHmdwoB/XMgkgiWoKzakkumEQixlkbZfu9FhFc84aAiTQl8tTG40ggJQRBtdFQxIOqHhSkslkCUUMTvYPkKqp5vyl59E+p4mgpuH6EkPX6BkerWjeWUPAyXyRhmiEXNkipuuENI1oKEgum0URAs+XZLNZVFUhGA7R3j6fkKahCEHwtSBXEw4xPPoXSkDOtNBUFV9KVHX8kXlVIs6ul16hP53B832E74PjsHjxYoQY9xopwfE9NFUhKCRWIV/RvNpkqjXD8Hz5Wi4/oY9EV1UWLejgN8/sxHFsjHCI5cuW0tE6DwDLcynZLqbrMS8RZ8/Bl6mNGVRi06w5BXKlIuWEge35WK6HJhQURdBUm+KatWuYqNonTLM9D8v1yFs2dUaYfD7Hq0eOcP3lf1XRvLOGAMUyOXhyiHg4Agg8KQlpKoHXChrJuJd4vo/j+zieDwKa4lH6hwZ5audzXHreudTUVPagRPi+Pyv2gGnbPLL9GRrntRKNRAiqGkFNRVdVEOD6Etf3QAoMXSMa1CmXTZ594QCZ9Cirzl/G3JY5f3ii38KsIQAgVyjw+NM7EBGDpqYmjIiBIgSaoqCpAl1Vka7LyeERurq7ccwyi9vbOHdh52Q5XClmFQEw3uw4fKyLQydOUDBtFD0IjHeCPNvBCAdpSKXoaGmmobb2DDwYmWUE/Lkxa/KAmcKbBMy0AjONNwmYaQVmGm8SMNMKzDTeJGCmFZhp/C//xkk+CPwUDwAAAABJRU5ErkJggg==',
            'data:image/png;base64,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',
            'data:image/png;base64,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',
            'data:image/png;base64,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',
            'data:image/png;base64,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',
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmtzIENTNui8sowAABxCSURBVHic7ZxpsGVXdd9/ezjDHd/YryeNQAPCBAKKAQuCHYEDCYlDCgfbBELFduwYExy7KhWn8sVVcVXyKfnklCtjuVJglx3sIjZJmIwgskAKMgKBhpbUrZ77db/xTmfYw8qHc+/rbqEeeQ8sx6vqqq/ePfeetf9nzXutrURE+HNG3tcYm1K7mjSxKCLD4SaDjQsoCayvPsSn/+hhfvlj/xqTLWK7KYEK5z02zbGYG76X3cN1fN9IAigLaZJSuwnRV9TFFrHe5syJY3ztG1/i537hV8kWDsBUfIzWBCMY1E3d688lgEmagkBdFzhfsXHxNK7YQFUDTh3/Nu9450fozd9JEI+xlrIOxOBot9tMxmPand4N30vv4Tq+fyQQ6pozp08TnGd5aYGN9VWef/4oC/2ce17zV0la85ikpAwXyTJFu9WGqGm3bhw8eIlLYJAIRPRlWicIUZeMCqFjFxhdPIuvnyZUz/HUE8f4yM//OiSzq7vkttu8VdPXTdJLUgJjjABopdFKIyiapWi8h83tEZ12yuJiwnhwkTNnVnnm6TNsbBU48bvKy0sSQKU1AkSJRAGNQaEJHlzlmessk6TCU099hfmeYePiCOf7vOvHfhLptHaVl5eoCkdCDIgoEmORCFXlEQJ5nmO04slvPMSrjuzjwS9+ifNnt/nZX/k1MJqJL0h3kZOXpASG6DDakBg79bYBiZ4ssRgjnD3+DIcOLPDwIw9x+uw5fvaj/wwkY2NzgrW7K4EvSQCVaqx9jDAcFiCBVjtHG2G0vUYoLzIabHD85Dnuve+dkPVAwcLCHOPRcFd5eUkCqJXGecd4PEYIZHkKeHw1ZGP9PPM9zxPffIz+3O38wBvejlMJYkAJLHQWd5eXXf217xH5EHEukKYp/X4XVKScDNjaWifN4NSxb7G6usp7/taPU5MhCgIwGY8h7i4ve+JEBIfCEINGAphZaqmaT2UauIXpfyMBTUQ1vpXKtUkTNf2tK8Oz8aTGDFfprtzOyE0XETV5nrB64jRaex54+DQf+vDPkeR9Yggoo3FRaHU7Tfaxi8veEwC9gyTRaMNlMh6I0REJWCygsaJBGRDDFDtigLYB6tgYOWOaf50DpZhLElhZQRSkKVSlI8sjT/zpV7n94CKf++PP8Ka3vJ3e8gpgQE0ZCBGlFeYWguVr0Z4AmNhZqB9BBQIekYAxBoPFVYbEqAYcmeqUimBAG/AqEIloNDM5LU2FiJAmgZSUQTEkTVN6eWTt9FFedtsyDz38EBHNG950H+gMiRptdPNwZCrLIreUcVyN9i4OjIKXGmUE0CiV7NxOZw0sGlBoBAcEBI8CbGzSK4lQFDUxRtK0R5pqiOA1dFo9kJLRxjnKwUVUnnDi5Dne+/c+gMm7gKb2jkw3Emi1acCLwk1Uq65LewRgI3lG26nNtmgguuYjn22h0HiEhAyFBXIEqAOY6FBKISLYDIxJMOaSv9MCQsQoxdrqeQ4uLfPxj/82b3vHe1hYOYKg8T5idHLpO83TIqJ21XPuDYCxBtPYOdCoqdYYQ7MIP09iaDzi7CXN50YDSUJd13jvybIMrTVlWQI0/y81UlecPH2MfSvLPProI+w7cAevfN2b8SEBA9bqmc8ihoCe3lzp3TWCewOgMiC2MTkBlAJ0BbEgFpsknRomI8q1C5w79TxnTh9nfWuVKhSN3d9wDAYDnHN0u13m5ubo9/vs37+fAwcOELuvZ/G2w9TlJuubI5545kl++qc/AkqjzMw0TG1rjE0AqEzjp5TaTQ3eKxWe/uxUqhQeGLN27pucePZxHvjdz7B27iIXTp/Dj2v6nXl6c/OYrE1E2Dh/Hj21XSFcIITAbOdBKYVbDPyjX/ol7vvr7+Y//tZ/5e33/zV0q9WYAA+ZdYgISkBCQKcZAHXwGLO7S94TACtdk4UapQ2eNjZUnHngn3P8sT/lP/1mSXcxpQjn8NKnvf8VdJZBa81w2zMcnCW3Fu9dsz+RpIwG2ywszDEpxyited2PvI+3/uiP85UvfpnnHvh97u09RlW/n+zIPyC2QUfdSB0RlWZ4NBGwGIz4pt6/S7QnmYiNGZgWqBwphZNPfYHKJJTpPIdeXVIXoMXS76QszkVyMyAW66iqoI1AWlHGIdvj8wQ9Ym7J4vSAwq8zt2z4lY9+gHOnvsr//sPfIFcVHdvl/NmvI5Ov08YhGMCCsnjfeHYDGDOrG+4eqb3YlYsevHWkQNw6z8nj/5PbbjvEcL3izPE/YfP8US5cXGf9Qo+tiy0unD/L5qpDFRkm2aDUCa1WixgjIQSKaoLguPPO23nve/8OB3/A8+RTj3FgucP+vEebyCheZNI5zJE3/mN895VNiXWmwtNUSJCdQsRu0Z4ACFAxRoctJsceBYnM3f0jIIb64hdI03upxycp620qd4rh+DFkDLqyOHec0bbFWksIgTxP6c/1qH3B9mCDdjtna2vAHYdfy7NHv4YbDfkr97yFkA5ZrQvuOvIT2CM/BTQOzGqagFI8PgoqyV4KTqTC0uHi+Udhssry8n1Ufp5JfZYwyukcbGFa99K3OVJ7su1vYishTi5wfv2z3JZsYIxBKcV4MmTt9HEGww1EHBuhwqYVsf9y2qrFWJ9l9eIJOv0Feq2cs888wOED95F0VxozIkwTaoUxeprX7B7tTTUmZJjCMz6/Sm/uEHbuLrKWp6qeQyUJk8QQWoqQR8b5U2zErzNWq5DnJO0+WkXKYgShpt9uM9dpY0Ig1xYbNak2+GrM/sX9FGVFKSM6c4uEQtFSQ7ZPfAVVn0PhqUIjiU0MqCn97pZj9gZABeunP0dXD8k6r0SyhNH4KPX2Gkp1yNMCjcFETYv9ZLKPJPQwsYa4iiNCYqhjpAqBJGtTB0PpFda2GW+3GE5OkeRCb+5OTlw4y7Onn+Tg4dugrqnOPoLfOApUYCEYDbMCht3dJe8NgHqdc6c/ydJciehFfKIYba+Sx3l6+R109AGy2kIBYTxA+wlpEFKfYeuEsavJ2m2itRR1RKUtxCRUXvA6Jc8PsT06QXfBMpoYsl6X9qLi2eNHabW6MDrJeP0krm6qz8pAdAHn3K4v+JZ+r9kYXEeGUAOBLaiAMYyBrU9/gvL8Y5w6/zUSn5MMEupwjA3zOMnCIVAjggZasFWdRmddahVRnSGVDMmTnLqsCL4iTSGEMUpqcmsxImg9wLsDbA4M+w7M4UrNxfNjugstChVpZZq1T/4a4/XnUYyoAK0NiUkaJneRbsmJBAlY6aDaTXxVRSGVApu2SCdPc/Kxf4tNtqjryNEzH8MuvZr+oUMs9F8FqiKKa1JlBV4sSI6xfWqtGYU+S2oLpQ1apEnPlEFrS4iR6COBmuA1VTkh15p9eZtMFHpzRF0ELpx9hom2hM//G172od+j7aZVXalIyL7/AKaqJoQWxo4w0sXoOcZ5xZyDcw9/AtW1mHqFeu0iRfgt4skO5dE30u2/Etn3R2Sv/iE0B0h6bfLJ8xjRWB9JVUnfGqg8ohQGgRBIFHTzDO9rEKG7MI8rI71Eo1WbbJSyde4cTz/2NKunN7jjcEq8fYXR45+ifO7/0L3rfpASjKBitquG6xbjwAoXM6wqUMFQ2ZQK6Fx8kic/8TOMK0jNgH0LFUsdT6gHrK9vMCwgTbuss4yvuvQW5jFZRbezAG6ObjuhCscxpulPURi8c2TWsLm5iSKilFCUI06fuMBoo8SNC1QNuYFOaiBquvOKdKWDcZvM3fZO7viFz8FwDdNbBudRyfe5pC8xQ2lQoYW4MUqnZBrOHP0fdIsR6E36nZIkREabHbzOsIttltoZXha5pzjPeHIRbRKcr5CtFuOBolCBwBbRrCBeQDSjwYQsSanqkkQrktRgg6VTVviipGtTSAISApUPxBiINSxsKZLlw6wd/TzzJ/6YuTvvRwWoE/v931hviroeFKisTQpkgzOceeJTjAfbFNlpfCviszahY1FZCxWXoGhTba4xiZG0ZzBdgQR0plg82GHpYIf5lTlW+sJSHxa6iowC4yfkeDJx5ASkGNJSArUgtWfa34EkkHQSyhIql6JjwLdg7Uv/DgcwGeF2ETy4VWtgmlI82hN0s2e49eQnKc58nVEYs+/QHSStRSYS8bZCzBjqMd0YOZxbKplDTI8gKVHaSMhQShEJKJWQtSKttqbby0hTizEKaxtlkQhJN6W32MdMRcm7iPfgKqhrRx41k7qCMCBrzzN6+kHU+a9Rp2aXXcgtAig4qDWwSRVhvLrBscd+j3YoWb5thYVVz0KxRTusg5/gtKfKS8apcKHqkdEm1kAZ6KoWbW3RZYGaTOiIUPiKWppduKDBo4hiqAJUTlgvx0yUpxKIRmGtITeKVENmDCldhts1pQ7Y0TZ1bZl87T8wzlrY8D3ozpq1j10BmshOUdMGBQZGsU01HtGpH0WdfpBs9ErU7c8wSArGvQWyapHOWoqWPop59ARCpwY9JEqNGEOtK2pd4KwQ04xCNEpaIJrKDVha7lK7Ah8jSZKBFnLTRgeh21FoE4gxUtaCTSzeBQopUBmM1ivGnT59s8apR7/IAkVTmb5sLXsC4KwaLCLEGJvqrlI7pSAvZVPgCAXzaZdTz30WI33y3jbiWpisy8b2MbJWSt7vUHOcLN2irTPyenDDzCml0Frv3PeFpSitNS+KgxbSAK6AXKdMIlRhm40nPgfTdexWWeuaKnx5GX1GMUaCVLgAidKoCEef/F2M6tFf3kBXbUwSUVER04qBGTFyMPGaotymF2/caswAnL1mPO3s2E3z2hl/Mt3z9TpOAVQkDqpEEWSLjUc+juzyxvpVVVhErmAcwDlHXddNHGUhN4vEC99gsn4SY6Az70lChjCibw+xWQ4ZtbocuPuf0jv0k5TdPoH8ukxdLvEvlMLLKUmS6X657HwPwCvBetAupxxW0OpjraN67rNI9T3oznqhfRARnHM7ttGQN6mYg5NPfZx+BJOO0WkLLYKuIRdHIV2WXvX3WXnLr7Pyg/+Kpdf9BBuxuikGX1zVIkLTXHSFuVbC7HKlIDEJW5tjTJKTWGC0xfDEV2/q/tejFwVwVswE8N5T1zUhBLTWpGmKJgM8VHDu2d9nXs+TtByVb6EpibFPjOfoL9/L/JGPgO0g7QO07/4AdXJzAL6YsZ+pcJraplNDqWnXxtTkiJ5WryoGZcC6iPHgElh//A92NGw36JoGyXtPCE0N1xiDtbZRpwgaC4OjlJvPkdSKdrfPpM5QpsIphbYwv/J6yA8y1I6tECH26Ej7ukxdbtMuf72QrLXTPpcrowblwaeWOlQ4o2BSQq2ZdA4wOfppYoxXBfFmgb0qgJd7X2stSZJcUicBAownz5ME8GVJu72ICxpMpNZD0POIXaIUwaiCdrqJHx8jG9/cHMa1FnU1L6w8BG2pHeisDUWNiQm+fYC4cXLvASzLEufcDniXOxIApyEaKB78DTL2EfZVbPkB861AlHkWfZstDjAY/SFZuc2IPtlgDv2tf4/0RtdlSplG4kKtMNFgRWFVowla5aiomqKCG9CZhyqANoY47YKwaSC6Em2hUxVsFRE6y3QGzzCxmsk3/wsuSZr9Y0ZMqIBIENDu5kr+diZl0EhdXdc7Xu9q8ZdSAuIYDTcIwZFlGpEASnCuIqh1XH2G9vkUtfUYC36Z4fO/w8apLxOsJ1fXTqhk2opmjMEVboc3bRQhel7oV5S6mrO5FMvuzJZozeaFYxzaucKgMJckz97krNzlN/be470nz/MrwogXMmSVYlJtMdg+BzGQ2KzpStUR7yP9+SPoyTOw+TjPfOp9xKVFbHmGvm5TtA5CuXFNpkQErQzGJAzLIUo1MyDGytSsTAG7hro1vDefXw6gMYatM9/kdl8DKUiCURYlTUECE7mZ/jcNTXxXFAUxxp1uqNnrRZ+sgKs2qYoLGB3JbAoS0LqR5s3hKVrmdrrz8ySp0JFnOWTuIU1ajNzTN8SYUgqFoa48app+NTYvXHmN4gqJFGHHM8+8dQiy4wy11rjN57G66fYizip6QnPJzeXKOoSw8+MzZ3FV4KZME6GarEMcYtXUIDYsYG1Kzj6qep5z/h7ye97JwHTZLkesrSvms/kbA08ZvA84F1CYKXiC1lcPbS69v/T3GaCXZ1WqvAixATDEmSOY2b6bq69Y59xOiHLD+WGAYryG1qBCJNbN03auQtEl65wgypAjb/wM3P2XOXD8M5x65EO00pRMhlRce9RgJnFlWROjNMG51sTo0abpo7507SVVvZx2Qh/1nX+nGkFZQAtCmLYSi2AU3OzEsJ552hl4M2m8JkWoiiHGNNd7B6lNmkYeZYmjLnXt4OBteGshcRTVJnnWp1pfviHGJComkwmInvaaJ9PI4NI11ysKzKRvdm3zN0F8wDvXBN+pIhJBZlueN1ek12ma7tiKFytjXY2Cr7AaJERENEmSNU9XNEYtgpvjwukHiFzk+WOfJAsZ9SSQt25MRWKMVKVDRCHSAHW1h3s9xbncS4sIGtMMVez8PU77j3fS6hsme3moMgPyehTyMZ10PzKEQevlSH6SBT+hE+5gkoyoafyYf/hjrD1MsweR9okMKXcWNLU8l5VHRIQonm5ss7E1RLwgMg1nfCRN2yCgdAU026FVGbHWEH1Am6YX2ldgM8HmEAS8B1RKogQfCrwekyRLbAPzoQBpUaYdtJSkkt9UF/8tbvCl9PorFAKJ3iYUQqwVQr0zRHMtUkrvhBaKCCoSokMIJElCXUdCaGLBHRVVlzdUfyc1Nq95n+SGEBpbaYBuN8VoQaiJUiGpRSUJqZpCIKAQzPT9zdAtdiZYFhZuZ5JBpjewdYIfKaC8oSDgO0xGjCiRJgxTivGwxtWNOWgKBZeBp670liKzOG8GoAYizjVNRRKglaREX6CoSWxAd+8GY6e/oPFx2gSv7E1J3yUuXrC461GIClrLhOWD6FiS0aYYVCjtCDdgRkO8ZDJC8Dspo1EKV9ZMJhWujjTzJTN+ZuBdGv5q7GPjcGbSJyIEEQSwJt0Zdgp+gojDGE338L3TxUdQCtFTIKK+aZHSt1LWabIdi73jB6f2JWE8qgCN1tf3YjFGlNForaZGHTKbEoNiuD2hKsNUhWerufRUZkHyTIJDmIYmsz5AGhtrDGhlsRrylsWmBieacW1ZOfIOgrIoHIhFJSB4CM38yc3QLalwMj2goXfkPSjdo4ieOgjVWGElue734ZKkNymZIjioJsJ45C9zZJfbPA2ikXhpVth7v1NQ1VPbK3HqpAR8qElbhrQF5JaJtzgWWX7F28AYNPV0+GYmgTQhzU2QvpXNFTXVovlXvIv+4l+iUjUmh8GGw02uXzDVWu+MLqTWEiOMhhWTQY3U6RXFjFlA3PBpEWmS/0b6ZukX0+/MigdTPpXQ7SUEVTOpK4Lucviue2Hu5QSmGa/MAJzmzd+tBN6QSocaVCTr3cnC8isIiZC1YXuzpBgW17/pNACPMWK0hagYjSZMxg5FMt0HaZbzQglELm0uNQ8BGm9tpoA3UmitJsstvX4bF0omdUXWXuDu176FSDKFS5il1mpqV79rAG9IImNCmD6z/t/8l2STjLayDHKPOi+4tRpdRVJrSE2KCS20zwiqpkjWiT6QJTmJzhkOPOsXJ1SjCFFQxKlXvcSPSCCEClRNkgrBQSvtMBpOyCwYrahdjTYKoyETKHWkvXCQaEfEIvJydZBu6y78mz6GNkw7FPqolOk2VwsyyG5g0+uaAN4QWcWkqugAeuEA+976YU5vBu7sKVze4uK2cG7dsbZVUbgandTY1JOR0wn7CF4xGdcMticMt0dUVTNZZIy5Yj/migLAVJ299xhjmEwmBNcEyT40h++INC6girDSXoL+OdY251lI4Dir3PbuX8TGzi0t+Wp0awAqSNMUEwtQXe76G79MftvbqEdCpQUhoyw146EwntSM3ZCiGOFHCjtcoBh6xts121sTJuOa6MKO3WvKVZdUt7F/TYOlUqYZfVOG8WDSVKBhJ1cOvokFterQPxAYb/U4sLLJhQLy17+bhde8A6rdbfK9tfY2BRkKpFFln+7jnh/9RZ767yepB+fotww2JMSRYlgUbJkaJZAGTzsaxpkjOE+MzQyR0aapwMTGrilzee6qdpzIDORYC0UBSaKaAyhcQFQTDVsLhw8FtuoOB3sj4tgzufs13P+3/4BQr1O3O+zmwSe3+DgibjIkaEswYJxj7lU/xqF3/iq97jwxFuSqoieKvMpRRYL3Fh8UEz/EVwJisSolNTlKmemvyhVeV2t7WXvJzFEYinFNcA37jVqDSCTNFXMLXWIv0jabZEnBSd/i/vd/HnSN8Qfxand7pG+tO0s8Sd5p5swFElNT0uLQm/8hR374gxTJfkppISGSa0svW6Kd78PmLVTmSIwhMZeKpDFOg2ulMC/aPdpIXvCCqwOjYTGtige8j2gDNhF6/ZTeQs7ZUcZC7jgZhB/+mT+B1hLELj53tHe1vfJWc2HXRE5phFheAJ2iK9CS0bnvo+y79yOElTewGR1jv4EPBVUZmFQ1IdYYBUqmJ0zExubNqtCXcly5Yh9DK4tznuFwRFVFrFV432Qc8/MJvX5Gq5eiTMli907OxDnu/+CDtF72muZ0ihxq7dB/FmxgkuYUFbSSEZ0WjEnoaKCMXGjdzZF3/QvOP9Tl1ORJGBdgK8RZdFS0WhlVHXZUVWuN0Rq5rEIzS/FELgGo0HjvGY+FUEPey3B1SStPWVyaB+vQpqYox8z3VnnVTz0Id7wWIgzTMTWRJent+nDbngwbrgFLVKizX+DZ//WbrH7rS/TSQNpJGLkxJAYlEY1Hx4iExiEpaaF0xiTfgihoLKnKiD5hPPIMtgsm4xqtLe20ZmkeWnMJg2gZV5aVuX0cOXwbnQ9/abeXdFXam2lNHxBnmrnmsMrFb/8OT3z5P+POPMmBdk7pM7S2aG0QpRAlODy1VAQcbTGk2pAokMpRDMaMhxACaAVLB9q4JAMdScM2LWPIbn8b2Vv/Celr38f1t612j/YGwBJIYKSaU4ragClOsvnIf+Pp//vb2OG3m+6CYFEh2ek0sEkzTC5Vj9qVlN41wBoNSYrptLB5i3q7Zs6t0dOQ3/lDtN788/Te+H4UTQ/0LrcAXpP2BMDSb5DYecJOyRIsrjnQoKhwxz7PqRMPc+rZz1FsfoO5BBYSSGrwBRS9ecQ7jESsAaSZc3NO8BHm9r2C7uv+Lr17P0i+8tom+QoViKXyCdnNZWPfFe0JgBUFIGivSKwFInWtkCRt+pLUedq0UTGBixdYPfYoq6cfYjx4HJFV8u3jKNUCO4/Y/Zj2HfSW7mH/na+jc+BuWLmT5gAaRYw5tU7QFlIixBHo/m4v6aq0NypcA2kEJggJPk57YbRH2CaJS8QIEh3WRFDTIY9pwXlim0lzA5hpShe9IEpjtGIcm3NkU81OgVoUlAJRwe5mu9emPRr5L/BVCx/AtgDlMUyaklFsQT2NJRSgXXO4gYYoligK65uGSTwNUhaCijgCgUjHazAJXoET0NGTKFDaEvjenmu6JwAWAqmKGBziBPEpOp0GsAoKXTYD1yjU9IixhiKCEHAoInZ2Oq8oCAp0CkrhPE3LrqqmJ/s0sopo8HH64feG9uzQif9f6CV5guWfJfoLAL9L+gsAv0v6f261/ZbitiuKAAAAAElFTkSuQmCC'
        ];
        // $scope.paymentList = ['ali','amex','android','apple','mastercard','Octopussmalllogo','paypal','visa','wechat'];

        // $scope.paymentTitleList = ['aliPay','amex','android','apple','master','Opmlg','paypal','visa','wechat'];


        // 初始化 payment method 和 order type default no currentPayment
        if (!$rootScope.currentPayment) {
            $rootScope.currentPayment = { id: 1, name: 'cash', code: $translate.instant('CASH'), translateKey: 'CASH' };
        }
        if (!$rootScope.currentOrderType) {
            $rootScope.currentOrderType = { id: 2, name: 'takeaway', translateKey: 'TAKE_AWAY', code: $translate.instant('TAKE_AWAY') };
        }
        $scope.cartDisplay = 'normal';

        $scope.dial_list = $localStorage.get('dial').dial_list;
        $scope.locale = $localStorage.get('settings').locale;
        $scope.title_translate = $localStorage.get('title_translate');
        $scope.checkoutReg = false;
        $scope.bigPhoto = '';
        $scope.customerTab = false;
        $scope.deliveryTypeTab = false;
        $scope.paymentTypeTab = false;
        $scope.paymentMethodTab = false;
        $scope.otherTypeTab = false;
        $scope.abs = Math.abs;
        $scope.can_add = true;
        $scope.partial_pick = false;
        $scope.inRootCategory = true;
        $scope.displayConfig = {
            category: {
                min: [0, 1, 2, 3, 4],
                normal: [0, 1, 2],
                max: [0]
            }
        };
        $scope.isSearching = false;
        $scope.isNewOrder = true;

        console.log($rootScope.platform);
        if ($rootScope.platform == 'web') {
            $scope.loadCategories('init');
            $scope.loadServingList('init');
            if ($rootScope.currentInvoiceId && $rootScope.currentInvoiceId != null)
                $scope.loadServingCart($rootScope.currentInvoiceId);
            // $rootScope.loadCustomerList('init');
        } else {
            if ($rootScope.networkResult) {
                $scope.loadCategories('init');
                $scope.loadServingList('init');
                if ($rootScope.currentInvoiceId && $rootScope.currentInvoiceId != null)
                    $scope.loadServingCart($rootScope.currentInvoiceId);
                // $rootScope.loadCustomerList('init');
            } else {
                document.addEventListener('deviceready', function() {
                    $scope.loadCategories('init');
                    $scope.loadServingList('init');
                    if ($rootScope.currentInvoiceId && $rootScope.currentInvoiceId != null)
                        $scope.loadServingCart($rootScope.currentInvoiceId);
                    // $rootScope.loadCustomerList('init');
                });
            }
        }

        if ($rootScope.currentInvoiceId && $scope.cart && $scope.cart.customer_info && $scope.cart.customer_info.user_id != '') {
            $rootScope.isMemberDetail = true;
            $rootScope.currentMemberId = $scope.cart.customer_info.member_id;
            $rootScope.currentMember = $scope.cart.customer_info;
            $rootScope.currentUserId = $scope.cart.customer_info.user_id;
        } else {
            $rootScope.isMemberDetail = false;
            $rootScope.currentMemberId = '';
            $rootScope.currentUserId = 0;
            $rootScope.currentMember = {};
            // $rootScope.newCart();
            // $rootScope.initCart();
        }

        $rootScope.homeSearchButtonBar = {
            // searchHints: $translate.instant('SEARCH_PRODUCT_HINTS'),
            homeSearchHints: $filter('translate')('SEARCH_PRODUCT_HINTS'),
            homeSearchKeyword: null,
            homeSearchFor: function(keyword) {
                $scope.loadProductList('refresh', null, keyword);
            },
            homeSearchClear: function(keyword) {
                $rootScope.homeSearchButtonBar.homeSearchKeyword = '';
                $scope.products = $scope.currentProducts;
            }
        };

        $scope.checkout = {
            customerTab: false,
            deliveryTypeTab: false,
            paymentTypeTab: false,
            paymentMethodTab: false,
            otherTypeTab: false
        };

    };

    $scope.selectNewOrderTab = function() {
        $scope.isNewOrder = true;

    };

    $scope.selectServingTab = function() {
        if (!$scope.isNewOrder)
            return;
        $scope.isNewOrder = false;
        $scope.loadServingList('refresh');

    };

    // add to cart
    $scope.addToCartByQR = function(sku) {
        console.log('addToCartByQR :' + sku);

        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'add',
            invoice_id: $rootScope.currentInvoiceId,
            product_id: '0',
            qty: '1',
            sku_no: sku,
            calling_type: 'f_b'
        }).then(function(res) {
            if (res.status == 'Y') {
                console.log(res);
                $scope.loadCart();
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });

    };
    /**************************************************
    // event handlers
    **************************************************/

    // go back
    $scope.goBack = function() {
        console.log('call home.js goBack');
        $helper.navBack(-1, 'slide-left-right');
    };
    $scope.$on('$ionicView.enter', function() {
        $rootScope.goBack = $scope.goBack;
    });

    // product back
    $scope.productBack = function() {
        $scope.searchButtonBar.homeSearchKeyword = null;

        switch ($scope.salesState) {
            case 'category':
                $scope.categories = $scope.categoriesStack.pop();
                $scope.currentCategoryStack.pop();
                break;
            case 'product-list':
                $scope.categories = $scope.categoriesStack.pop();
                $scope.currentCategoryStack.pop();
                if ($scope.categories == undefined) {
                    console.log('category = undefined !!!!!');
                    $scope.categories = $rootScope.rootCategory;
                    $scope.currentCategoryStack = [{ id: null, name: $translate.instant('CATEGORIES') }];
                }
                $scope.salesState = 'category';
                $scope.products = null;
                break;

            case 'product-detail':
                $scope.salesState = 'product-list';
                if ($scope.products == null) {
                    $scope.salesState = 'category';
                }
                break;
            case 'checkout':
                break;
        }

        console.log('category length: ');
        console.log($scope.categoriesStack.length);
        $scope.inRootCategory = $scope.categoriesStack.length < 1 ? true : false;
    };

    // plus add to cart qty
    $scope.plusAddQty = function() {
        if ($scope.cart.payed_amount > 0) {
            $helper.toast($translate.instant('THIS_CART_IS_PAYED'), 'long', 'bottom');
            return;
        }
        console.log('plus add sku:' + $scope.editSku + ', item:' + $scope.editItemId);
        $scope.cartItem.qty++;
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'update',
            invoice_id: $rootScope.currentInvoiceId,
            product_id: $scope.cartItem.id,
            item_id: $scope.editItemId ? $scope.editItemId : $scope.cartItem.item_id,
            sku_no: $scope.editSku ? $scope.editSku : $scope.cartItem.sku_no,
            qty: $scope.cartItem.qty,
            calling_type: 'f_b'
        }).then(function(res) {
            if (res.status == 'Y') {
                $scope.cart = res.data;
                for (var i = 0; i < res.data.products.length; i++) {
                    if ($scope.editItemId == res.data.products[i].item_id) {
                        $scope.cartItem = res.data.products[i];
                        judgeStatus($scope.cartItem.served);
                        $scope.cartItem.qty = res.data.products[i].qty;
                    }
                }
                $scope.cart.temp_grand_total = $scope.cart.grand_total;
                $scope.calculateCharge();
            } else {
                $scope.cartItem.qty--;
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $scope.cartItem.qty--;
            $helper.toast(err, 'long', 'bottom');
        });
    };

    // minus add to cart qty
    $scope.minusAddQty = function() {
        if ($scope.cart.payed_amount > 0) {
            $helper.toast($translate.instant('THIS_CART_IS_PAYED'), 'short', 'bottom');
            return;
        }
        console.log('minus add sku:' + $scope.editSku + ', item:' + $scope.editItemId);
        if ($scope.cartItem.qty == 1) {
            return;
        }
        $scope.cartItem.qty--;
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'update',
            invoice_id: $rootScope.currentInvoiceId,
            product_id: $scope.cartItem.id,
            item_id: $scope.editItemId ? $scope.editItemId : $scope.cartItem.item_id,
            sku_no: $scope.editSku ? $scope.editSku : $scope.cartItem.sku_no,
            qty: $scope.cartItem.qty,
            calling_type: 'f_b'
        }).then(function(res) {
            if (res.status == 'Y') {
                $scope.cart = res.data;
                for (var i = 0; i < res.data.products.length; i++) {
                    if ($scope.editItemId == res.data.products[i].item_id) {
                        $scope.cartItem = res.data.products[i];
                        judgeStatus($scope.cartItem.served);
                        $scope.cartItem.qty = res.data.products[i].qty;
                    }
                }
                $scope.cart.temp_grand_total = $scope.cart.grand_total;
                $scope.calculateCharge();
            } else {
                $scope.cartItem.qty++;
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $scope.cartItem.qty++;
            $helper.toast(err, 'long', 'bottom');
        });
    };



    // check addQTY
    $scope.checkAddQty = function() {
        console.log('max: ' + $scope.product.maxAddQty);
        console.log($scope.product.addQty);
        console.log($scope.product.minAddQty);
        // if ($scope.product.addQty > $scope.product.maxAddQty) {
        //     $scope.product.addQty = $scope.product.maxAddQty;
        // }
        if ($scope.product.addQty == null) {

        }
    };

    // check addQty of reserve
    $scope.checkreserveAddQty = function() {
        if ($scope.reserve.addQty > $scope.reserve.qty) {
            $scope.reserve.addQty = $scope.reserve.qty;
        }
        if ($scope.reserve.addQty == null) {

        }
    };

    $scope.getItemOption = function(item, $event) {
        console.log('fucking item : ');
        console.log(item);
        $scope.cartItem = item;
        if (!$scope.editSku) {
            $scope.editSku = item.sku_no;
        }
        if (!$scope.editItemId) {
            $scope.editItemId = item.item_id;
        }
        console.log('edit cart sku:' + $scope.editSku + ', item:' + $scope.editItemId);
        if (!item.specifications) {
            // if (true) {            
            $api.getProductDetail({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                product_id: item.id
            }).then(function(res) {
                if (res.status == 'Y') {
                    $scope.cartItem.specifications = res.data.specifications;
                    $scope.product = res.data;
                    $scope.product.addOptions = {};
                    $scope.selectSpecifications = [];
                    var i = 0;
                    angular.forEach($scope.product.specifications, function(spec) {
                        if (spec.enabled && spec.selectible && spec.options.length) {
                            spec.options[0].selected = true;
                            $scope.selectSpecifications.push(spec);
                            $scope.product.addOptions[i] = {
                                dictionary: spec.dictionary,
                                option: spec.options[0].id
                            };
                            i++;
                        }
                    });

                    $scope.editSku = null;
                    $scope.editItemId = null;
                    $scope.can_add = true;
                    if ($event != undefined) {
                        if ($scope.cartDisplay != 'normal') {
                            $scope.cartDisplay = 'normal';
                            $timeout(function() {
                                $scope.popoverEditCart($event);
                            }, 600);
                        } else {
                            $scope.popoverEditCart($event);
                        }
                    }
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.toast(err, 'long', 'bottom');
            });
        } else {
            console.log('have item.specifications ~~~~~~~~~~~~~~~~~~~~~~~~');
            $scope.cartItem.specifications = item.specifications;
            $scope.product = item;
            $scope.product.addOptions = {};
            $scope.selectSpecifications = [];
            var i = 0;
            angular.forEach($scope.product.specifications, function(spec) {
                if (spec.enabled && spec.selectible && spec.options.length) {
                    spec.options[0].selected = true;
                    $scope.selectSpecifications.push(spec);
                    $scope.product.addOptions[i] = {
                        dictionary: spec.dictionary,
                        option: spec.options[0].id
                    };
                    i++;
                }
            });

            $scope.editSku = null;
            $scope.editItemId = null;
            $scope.can_add = true;
            if ($event != undefined) {
                if ($scope.cartDisplay != 'normal') {
                    $scope.cartDisplay = 'normal';
                    $timeout(function() {
                        $scope.popoverEditCart($event);
                    }, 600);
                } else {
                    $scope.popoverEditCart($event);
                }
            }
        }
    };

    $scope.addToCart = function(product, $event) {
        if ($scope.cart.payed_amount > 0) {
            $helper.toast($translate.instant('THIS_CART_IS_PAYED'), 'long', 'bottom');
            return;
        }
        if (!$scope.can_add) {
            console.log('add to cart is loading, cannot add');
            return;
        }
        //提前 add to cart
        var preAddProduct = product;
        preAddProduct.qty = 1;
        preAddProduct.served = 0;
        preAddProduct.sub_total = preAddProduct.price;
        $scope.cart.products.push(preAddProduct);
        // $scope.getItemOption(product,$event);
        //-------
        $scope.can_add = false;
        $scope.glued = true;
        $scope.addOptions = {};
        var i = 0;
        angular.forEach(product.specifications, function(spec) {
            if (spec.enabled && spec.selectible && spec.options.length) {
                $scope.addOptions[i] = {
                    dictionary: spec.dictionary,
                    option: spec.options[0].id
                };
            }
            i++;
        });
        var spec = [];
        angular.forEach($scope.addOptions, function(opt) {
            spec.push(opt);
        });

        if ($rootScope.currentInvoiceId) {
            $api.setCart({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                warehouse_id: $localStorage.get('user').warehouse_id,
                action: 'add',
                invoice_id: $rootScope.currentInvoiceId,
                product_id: product.id,
                qty: product.qty ? product.qty : 1,
                spec: JSON.stringify(spec),
                // currency: $scope.product.currency,
                invoice_charges: angular.toJson($scope.cart.invoice_charges),
                calling_type: 'f_b'
            }).then(function(res) {
                if (res.status == 'Y') {
                    console.log('caocao2');
                    console.log(angular.toJson(res.data.products[0]));
                    $scope.isNewOrder = true;
                    $scope.cart = res.data;
                    $scope.cart.temp_grand_total = $scope.cart.grand_total;
                    $scope.calculateCharge();
                    for (var i = 0; i < $scope.cart.products.length; i++) {
                        //add to cart 后调出 edit cart
                        if ($scope.cart.products[i].item_id == res.item_id) {
                            $scope.cart.products[i].specifications = product.specifications;
                            // $scope.cartItem.item_id = res.item_id;
                            // $scope.cartItem.sku_no = res.sku_no;
                            if (spec.length > 0) {
                                console.log('editCartItem :' + i);
                                $scope.editCartItem($scope.cart.products[i], $event);
                                break;
                            }
                        }
                    }
                    $scope.can_add = true;
                    $scope.scrollCartToBottom();
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                    $scope.can_add = true;
                    $scope.isNewOrder = false;
                    $rootScope.initCart();

                }

            }).catch(function(err) {
                $scope.can_add = true;
                $helper.toast(err, 'long', 'bottom');
                $scope.isNewOrder = false;
                $rootScope.initCart();

            });
        } else {
            $api.newCart({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                check_out_warehouse_id: $localStorage.get('user').warehouse_id
            }).then(function(res) {
                if (res.status == 'Y') {
                    $rootScope.currentInvoiceId = res.invoice_id;
                    $api.setCart({
                        token: $localStorage.get('settings').token,
                        locale: $localStorage.get('settings').locale,
                        warehouse_id: $localStorage.get('user').warehouse_id,
                        action: 'add',
                        invoice_id: $rootScope.currentInvoiceId,
                        product_id: product.id,
                        qty: 1,
                        spec: JSON.stringify(spec),
                        // currency: $scope.product.currency,
                        invoice_charges: angular.toJson($scope.cart.invoice_charges),
                        calling_type: 'f_b'
                    }).then(function(res) {
                        if (res.status == 'Y') {
                            console.log(res);
                            $scope.isNewOrder = true;
                            $scope.cart = res.data;
                            $scope.cart.temp_grand_total = $scope.cart.grand_total;
                            $scope.calculateCharge();
                            for (var i = 0; i < $scope.cart.products.length; i++) {
                                //add to cart 后调出 edit cart
                                if ($scope.cart.products[i].item_id == res.item_id) {
                                    $scope.cart.products[i].specifications = product.specifications;
                                    // $scope.cartItem.item_id = res.item_id;
                                    if (spec.length > 0) {
                                        console.log('editCartItem :' + i);
                                        $scope.editCartItem($scope.cart.products[i], $event);
                                        break;
                                    }
                                }
                            }
                            $scope.can_add = true;
                        } else {
                            $helper.toast(res.msg, 'short', 'bottom');
                            $scope.can_add = true;
                            $scope.isNewOrder = false;
                            $rootScope.initCart();
                        }

                    }).catch(function(err) {
                        $scope.can_add = true;
                        $helper.toast(err, 'long', 'bottom');
                        $scope.isNewOrder = false;
                        $rootScope.initCart();
                    });
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                    $scope.isNewOrder = false;
                    $rootScope.initCart();
                }
            }).catch(function(err) {
                $helper.toast(err, 'long', 'bottom');
                $scope.isNewOrder = false;
                $rootScope.initCart();
            });
        }

    };

    // save cart
    $scope.saveCart = function() {
        console.log($scope.cart, $rootScope.currentOrderType.id);
        if (($scope.cart == null) || ($scope.cart.products.length < 1 && $rootScope.currentOrderType.id == 2)) {
            console.log('return lalala');
            $helper.toast($translate.instant('THIS_CART_IS_EMPTY'), 'short', 'bottom');
            return;
        }
        $scope.isNewOrder = false;
        $rootScope.isMemberDetail = false;
        $rootScope.currentMemberId = '';
        $rootScope.currentUserId = 0;
        $rootScope.currentMember = {};
        if ($rootScope.currentOrderType.id == 1 || $scope.cart.products.length > 0) {
            $rootScope.newCart();
        }
        // $timeout(function(){$rootScope.currentInvoiceId = null},1000);
    };

    // expand cart
    $scope.expandCart = function() {

        if ($scope.cartDisplay == 'min') $scope.cartDisplay = 'normal';
        else if ($scope.cartDisplay == 'normal') $scope.cartDisplay = 'max';

    };

    // collapse cart
    $scope.collapseCart = function() {

        if ($scope.cartDisplay == 'max') $scope.cartDisplay = 'normal';
        else if ($scope.cartDisplay == 'normal') $scope.cartDisplay = 'min';

    };

    // new cart
    $rootScope.newCart = function() {
        console.log('new cart');
        $api.newCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            check_out_warehouse_id: $localStorage.get('user').warehouse_id
        }).then(function(res) {
            if (res.status == 'Y') {
                $scope.can_add = true;
                $scope.cart = { "item_total": 0, "discount_total": 0, "delivery_total": 0, "service_total": 0, "temp_grand_total": 0, "products": [] };
                $rootScope.currentOrderType = { id: 2, name: 'takeaway', translateKey: 'TAKE_AWAY', code: $translate.instant('TAKE_AWAY') };
                $rootScope.currentPayment = { id: 1, name: 'cash', code: $translate.instant('CASH'), translateKey: 'CASH' };
                $scope.setTempTotal($scope.cart.temp_grand_total);
                $rootScope.currentInvoiceId = res.invoice_id;
                $scope.loadServingList('refresh');
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });
    };

    $scope.newCartScan = function() {
        document.addEventListener("deviceready", function() {

            $helper.scan(function(scanData) {
                if (scanData.cancelled == 0) {
                    console.log(scanData.text);

                    $rootScope.customerScanKeyword = scanData.text;
                    $scope.newCartModal.hide();
                    $scope.newCartModal.remove();
                    $helper.navForth('tab.customer', null, 'slide-left-right');
                }
            });
        }, false);

    };

    $scope.showNewCartRegisterForm = function() {
        $scope.newCartVisitor = false;
    };

    $scope.showCheckOutRegisterForm = function() {

        $scope.checkoutReg = !$scope.checkoutReg;
        if (!$scope.newMember)
            $scope.newMember = {
                firstName: '',
                lastName: '',
                email: '',
                countryCode: '852',
                mobile: ''
            };

    };


    $scope.cancelNewCart = function() {

        $scope.newCartModal.hide();
        $scope.newCartModal.remove();

    };


    $scope.confirmNewCart = function(mode) {
        if (mode == 'VISITOR') {
            $api.newCart({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                billing_last_name: $scope.newVisitor.lastName,
                gender: $scope.newVisitor.titleId,
                check_out_warehouse_id: $localStorage.get('user').warehouse_id
            }).then(function(res) {
                if (res.status == 'Y') {
                    $scope.newCartModal.hide();
                    $scope.newCartModal.remove();
                    $rootScope.currentInvoiceId = res.invoice_id;
                    $scope.loadCart();
                    if ($scope.salesState == 'checkout') {
                        $scope.salesState = $scope.salesState_beforeCheckOut;
                    }
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.toast(err, 'long', 'bottom');
            });
        }
        if (mode == 'MEMBER') {
            $api.newMember({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                first_name: $scope.newMember.firstName,
                last_name: $scope.newMember.lastName,
                email: $scope.newMember.email,
                country_code: $scope.newMember.countryCode,
                mobile: $scope.newMember.mobile
            }).then(function(res) {
                if (res.status == 'Y') {
                    $api.newCart({
                        token: $localStorage.get('settings').token,
                        locale: $localStorage.get('settings').locale,
                        user_id: res.user_id,
                        check_out_warehouse_id: $localStorage.get('user').warehouse_id
                    }).then(function(res) {
                        if (res.status == 'Y') {
                            $scope.newCartModal.hide();
                            $scope.newCartModal.remove();
                            $rootScope.currentInvoiceId = res.invoice_id;
                            $scope.loadCart();
                            if ($scope.salesState == 'checkout') {
                                $scope.salesState = $scope.salesState_beforeCheckOut;
                            }
                        } else {
                            $helper.toast(res.msg, 'short', 'bottom');
                        }
                    }).catch(function(err) {
                        $helper.toast(err, 'long', 'bottom');
                    });
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.toast(err, 'long', 'bottom');
            });


        }
    };

    //choose new member code
    $scope.selectNewMemberDial = function() {
        if ($rootScope.countryCodeList == null) {
            $rootScope.countryCodeList = [];
            var list = $localStorage.get('dial').dial_list;
            for (var i = 0; i < list.length; i++) {
                var title = list[i];
                $rootScope.countryCodeList.push({
                    name: title.country_name,
                    value: title.dial_code,
                    checked: title.dial_code == $scope.newMember.countryCode,
                    data: title
                });
            }
        }
        $scope.countryOptions = $rootScope.countryCodeList.slice(0, 10);
        var limit = 0;
        var dialList = $localStorage.get('dial').dial_list;
        $helper.countryCodePick({
            scope: $scope,
            title: 'SELECT_COUNTRY_CODE',
            options: $scope.countryOptions,
            multiple: false,
            template: 'templates/common.country-code-picker.html',
            confirmCallback: function(selectedObjs) {
                $scope.newMember.countryCode = selectedObjs[0].value;
            },
            loadMoreFunc: function() {
                $scope.$broadcast('scroll.infiniteScrollComplete');
            }
        });
    };

    $scope.selectTitle = function() {

        var options = [];
        angular.forEach($localStorage.get('titles'), function(title) {
            options.push({
                name: title['title_' + $translate.use()],
                value: title.title_id,
                checked: title.title_id == $scope.newVisitor.titleId,
                data: title
            });
        });
        console.log(options);
        $helper.picker({
            scope: $scope,
            title: 'SELECT_TITLE',
            options: options,
            multiple: false,
            confirmCallback: function(selectedObjs) {
                $scope.newVisitor.titleId = selectedObjs[0].value;
                $scope.newVisitor.titleName = selectedObjs[0].name;

            }
        });

    };
    //register when checkout
    $scope.checkoutRegisterSubmit = function(form) {
        //console.log($scope.newMember);
        if (form.$valid) {
            $api.newMember({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                first_name: $scope.newMember.firstName,
                last_name: $scope.newMember.lastName,
                email: $scope.newMember.email,
                country_code: $scope.newMember.countryCode,
                mobile: $scope.newMember.mobile,
            }).then(function(res) {
                if (res.status == 'Y') {
                    checkUndefined();
                    $api.setCart({
                        token: $localStorage.get('settings').token,
                        locale: $localStorage.get('settings').locale,
                        warehouse_id: $localStorage.get('user').warehouse_id,
                        action: 'address',
                        invoice_id: $rootScope.currentInvoiceId,
                        billing_country_id: $scope.deliveryTypeData.billingCountry,
                        billing_region_id: $scope.deliveryTypeData.billingRegion,
                        billing_district_id: $scope.deliveryTypeData.billingDistrict,
                        billing_area_id: $scope.deliveryTypeData.billingArea,
                        billing_address_1: $scope.deliveryTypeData.billingAddress1,
                        billing_address_2: $scope.deliveryTypeData.billingAddress2,
                        billing_address_3: $scope.deliveryTypeData.billingAddress3,
                        billing_address_4: $scope.deliveryTypeData.billingAddress4,
                        billing_first_name: $scope.deliveryTypeData.billingFirstName,
                        billing_last_name: $scope.deliveryTypeData.billingLastName,
                        billing_email: $scope.deliveryTypeData.billingEmail,
                        billing_country_code: $scope.deliveryTypeData.billingCountryCode,
                        billing_mobile: $scope.deliveryTypeData.billingMobile,
                        shipping_country_id: $scope.deliveryTypeData.shippingCountry,
                        shipping_region_id: $scope.deliveryTypeData.shippingRegion,
                        shipping_district_id: $scope.deliveryTypeData.shippingDistrict,
                        shipping_area_id: $scope.deliveryTypeData.shippingArea,
                        shipping_address_1: $scope.deliveryTypeData.shippingAddress1,
                        shipping_address_2: $scope.deliveryTypeData.shippingAddress2,
                        shipping_address_3: $scope.deliveryTypeData.shippingAddress3,
                        shipping_address_4: $scope.deliveryTypeData.shippingAddress4,
                        shipping_first_name: $scope.deliveryTypeData.shippingFirstName,
                        shipping_last_name: $scope.deliveryTypeData.shippingLastName,
                        shipping_email: $scope.deliveryTypeData.shippingEmail,
                        shipping_country_code: $scope.deliveryTypeData.shippingCountryCode,
                        shipping_mobile: $scope.deliveryTypeData.shippingMobile,
                        pay_method: $scope.paymentMethodData.pay_method,
                        remark: $scope.deliveryTypeData.remark,
                        delivery_type: $scope.deliveryTypeData.deliveryType,
                        carry_up: $scope.deliveryTypeData.carryUpFloor,
                        pick_up_warehouse_id: $scope.deliveryTypeData.pickUpLocation,
                        payment_type: $scope.paymentTypeData.payment_type,
                        payed_amount: $scope.paymentTypeData.payed_amount,
                        user_id: res.user_id,
                        pick_up_country_code: $scope.deliveryTypeData.pickUpCountryCode,
                        pick_up_mobile: $scope.deliveryTypeData.pickUpMobile,
                        pick_up_first_name: $scope.deliveryTypeData.pickUpFirstName,
                        pick_up_last_name: $scope.deliveryTypeData.pickUpLastName,
                        pick_up_email: $scope.deliveryTypeData.pickUpEmail,
                        custom_discount: $scope.deliveryTypeData.specialDiscount,
                        other_charge: $scope.deliveryTypeData.specialServiceCharge,
                        expected_delivery_date: $scope.deliveryTypeData.deliveryDate,
                        invoice_charges: angular.toJson($scope.cart.invoice_charges),
                        calling_type: 'f_b'
                    }).then(function(res) {
                        if (res.status == 'Y') {
                            $scope.cart = res.data;
                            $scope.calculateCharge();
                            $scope.loadCheckout();
                            $scope.checkoutReg = !$scope.checkoutReg;
                            $scope.customerTab = false;

                        } else {
                            $helper.toast(res.msg, 'short', 'bottom');
                        }
                    }).catch(function(err) {
                        $helper.toast(err, 'long', 'bottom');
                    });
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.toast(err, 'long', 'bottom');
            });
        }

    };

    $scope.deleteServingCart = function(invoiceId) {
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'delete',
            invoice_id: invoiceId,
            calling_type: 'f_b'
        }).then(function(res) {
            if (res.status == 'Y') {
                if (res.table_num && res.table_num != 0) {
                    $rootScope.tableOperation.removeInvoice(res.table_num, invoiceId);
                }
                $rootScope.newCart();
                $scope.loadServingList('refresh');
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });
    };

    $scope.editCartItem = function(item, $event) {
        console.log(item);
        $scope.cartItem = item;
        if (!$scope.editSku) {
            $scope.editSku = item.sku_no;
        }
        if (!$scope.editItemId) {
            $scope.editItemId = item.item_id;
        }
        console.log('edit cart sku:' + $scope.editSku + ', item:' + $scope.editItemId);
        if (!item.specifications) {
            $api.getProductDetail({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                product_id: item.id
            }).then(function(res) {
                if (res.status == 'Y') {
                    $scope.cartItem.specifications = res.data.specifications;
                    $scope.product = res.data;
                    $scope.product.addOptions = {};
                    $scope.selectSpecifications = [];
                    var i = 0;
                    angular.forEach($scope.product.specifications, function(spec) {
                        if (spec.enabled && spec.selectible && spec.options.length) {
                            angular.forEach(spec.options, function(opt) {
                                angular.forEach(item.options[i].options, function(option) {
                                    if (option == opt.name) {
                                        console.log(opt.name);
                                        opt.selected = true;
                                    }
                                });
                            });
                            $scope.selectSpecifications.push(spec);

                            $scope.product.addOptions[i] = {
                                dictionary: spec.dictionary,
                                option: spec.options[0].id
                            };
                            i++;
                        }
                    });
                    console.log($scope.product.addOptions);
                    console.log($scope.product.specifications);

                    $scope.editSku = null;
                    $scope.editItemId = null;
                    $scope.can_add = true;
                    if ($event != undefined) {
                        if ($scope.cartDisplay != 'normal') {
                            $scope.cartDisplay = 'normal';
                            $timeout(function() {
                                $scope.popoverEditCart($event);
                            }, 600);
                        } else {
                            $scope.popoverEditCart($event);
                        }
                    }
                } else {
                    $helper.toast(res.msg, 'short', 'bottom');
                }
            }).catch(function(err) {
                $helper.toast(err, 'long', 'bottom');
            });
        } else {
            $scope.cartItem.specifications = item.specifications;
            $scope.product = item;
            $scope.product.addOptions = {};
            $scope.selectSpecifications = [];
            var i = 0;
            angular.forEach($scope.product.specifications, function(spec) {
                if (spec.enabled && spec.selectible && spec.options.length) {
                    angular.forEach(spec.options, function(opt) {
                        opt.selected = false;
                        angular.forEach(item.options[i].options, function(option) {
                            if (option == opt.name) {
                                console.log(opt.name);
                                opt.selected = true;
                            }
                        });
                    });
                    $scope.selectSpecifications.push(spec);

                    $scope.product.addOptions[i] = {
                        dictionary: spec.dictionary,
                        option: spec.options[0].id
                    };
                    i++;
                }
            });
            console.log($scope.product.addOptions);
            console.log($scope.product.specifications);

            $scope.editSku = null;
            $scope.editItemId = null;
            $scope.can_add = true;
            if ($event != undefined) {
                if ($scope.cartDisplay != 'normal') {
                    $scope.cartDisplay = 'normal';
                    $timeout(function() {
                        $scope.popoverEditCart($event);
                    }, 600);
                } else {
                    $scope.popoverEditCart($event);
                }
            }
        }

    };

    // choose sku
    $scope.chooseSKU = function(spec_id, dict_id, opt_id) {

        $scope.product.addOptions[spec_id] = {
            dictionary: dict_id,
            option: opt_id
        };
        console.log($scope.product.addOptions);
        console.log($scope.selectSpecifications);
        $scope.getSKUInfo();
    };

    $scope.editCartOptions = function(item, spec_id, dict_id, opt_id) {
        if (!$scope.editSku) {
            $scope.editSku = item.sku_no;
        }
        if (!$scope.editItemId) {
            $scope.editItemId = item.item_id;
        }
        console.log($scope.product.addOptions);
        console.log('edit options sku:' + $scope.editSku + ', item:' + $scope.editItemId);

        $scope.product.addOptions[spec_id] = {
            dictionary: dict_id,
            option: opt_id
        };
        console.log($scope.product.addOptions);
        console.log('spec_id:' + spec_id + ', dict_id:' + dict_id + ', opt_id:' + opt_id);
        angular.forEach($scope.selectSpecifications[spec_id].options, function(option) {
            option.selected = false;
            if (option.id == opt_id) {
                option.selected = true;
            }
        });
        console.log($scope.selectSpecifications);
        var spec = [];
        angular.forEach($scope.product.addOptions, function(opt) {
            spec.push(opt);
        });
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'remove',
            invoice_id: $rootScope.currentInvoiceId,
            product_id: item.id,
            item_id: $scope.editItemId,
            sku_no: $scope.editSku
        }).then(function(res) {
            if (res.status == 'Y') {
                $api.setCart({
                    token: $localStorage.get('settings').token,
                    locale: $localStorage.get('settings').locale,
                    warehouse_id: $localStorage.get('user').warehouse_id,
                    action: 'add',
                    invoice_id: $rootScope.currentInvoiceId,
                    product_id: item.id,
                    qty: $scope.cartItem.qty,
                    spec: JSON.stringify(spec),
                    // currency: $scope.product.currency,
                    invoice_charges: angular.toJson($scope.cart.invoice_charges),
                    calling_type: 'f_b'
                }).then(function(res) {
                    if (res.status == 'Y') {
                        $scope.editSku = res.sku;
                        $scope.editItemId = res.item_id;
                        console.log(res);
                        console.log('addToCart sku:' + $scope.editSku + ', item:' + $scope.editItemId);
                        $scope.cart = res.data;
                        $scope.can_add = true;
                        for (var i = 0; i < $scope.cart.products.length; i++) {
                            //add to cart 后调出 edit cart
                            if ($scope.cart.products[i].id == item.id) {
                                $scope.cart.products[i].specifications = item.specifications;
                                // $scope.editCartItem($scope.cart.products[i], $event);
                            }
                        }
                        for (var i = 0; i < res.data.products.length; i++) {
                            if ($scope.editItemId == res.data.products[i].item_id) {
                                $scope.cartItem = res.data.products[i];
                                judgeStatus($scope.cartItem.served);
                                $scope.cartItem.qty = res.data.products[i].qty;
                            }
                        }
                        $scope.cart.temp_grand_total = $scope.cart.grand_total;
                        $scope.calculateCharge();
                        $scope.scrollCartToBottom();
                    } else {
                        $helper.toast(res.msg, 'short', 'bottom');
                        $scope.can_add = true;
                    }

                }).catch(function(err) {
                    $scope.can_add = true;
                    $helper.toast(err, 'long', 'bottom');
                });
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });

    };

    $scope.popoverEditCart = function($event) {
        console.log('show edit cart');
        console.log($scope.cartItem);
        for (var i = 0; i < $scope.serveStatus.length; i++) {
            if ($scope.serveStatus[i].id == $scope.cartItem.served) {
                $scope.currentServeStatus = $scope.serveStatus[i];
            }
            $scope.serveStatus[i].name = $translate.instant($scope.serveStatus[i].translateKey);
        }
        judgeStatus($scope.cartItem.served);
        $ionicPopover.fromTemplateUrl('templates/popover.edit-cart.html', {
            scope: $scope
        }).then(function(popover) {
            $scope.slectIndex = 0;
            $scope.popover = popover;
            $scope.popover.show($event);
            $scope.popoverBack = function() {
                if ($scope.popover) {
                    $scope.popover.hide();
                    $scope.popover.remove();
                }
            };
        });
    };


    $scope.changeTotal = function(option) {
        console.log(option);
    };

    $scope.cartQtychange = function() {
        checkQty();
    };
    $scope.plusCartItemQty = function() {
        if (!angular.isNumber($scope.cartItem.qty)) return;
        $scope.cartItem.qty++;

        // if ($scope.cartItem.qty > $scope.cartItem.maxQty) {
        //     $scope.cartItem.qty = $scope.cartItem.maxQty;
        // } else {
        //     $scope.cartItem.avbl_qty--;
        // }
        // $scope.cartItem.avbl_qty = $scope.cartItem.avbl_qty_ref - $scope.cartItem.qty + $scope.cartItem.qty_ref;
        checkQty();
    };

    $scope.minusCartItemQty = function() {
        if (!angular.isNumber($scope.cartItem.qty)) return;
        $scope.cartItem.qty--;

        // if ($scope.cartItem.qty < $scope.cartItem.minQty) {
        //     $scope.cartItem.qty = $scope.cartItem.minQty;

        // } else {
        //     $scope.cartItem.avbl_qty++;
        // }
        // $scope.cartItem.avbl_qty = $scope.cartItem.avbl_qty_ref - $scope.cartItem.qty + $scope.cartItem.qty_ref;
        checkQty();
    };

    var checkQty = function() {
        if ($scope.cartItem.qty == null) return;
        if ($scope.cartItem.qty > $scope.cartItem.maxQty) {
            $scope.cartItem.qty = $scope.cartItem.maxQty;
        } else {
            if ($scope.cartItem.qty < $scope.cartItem.minQty) {
                $scope.cartItem.qty = $scope.cartItem.minQty;
            }
        }
        $scope.cartItem.avbl_qty = $scope.cartItem.avbl_qty_ref - $scope.cartItem.qty + $scope.cartItem.qty_ref;
        console.log($scope.cartItem.qty);
    };

    $scope.confirmDeleteEditCartItem = function(item) {
        if ($scope.cart.payed_amount > 0) {
            $helper.toast($translate.instant('THIS_CART_IS_PAYED'), 'long', 'bottom');
            return;
        }
        console.log(item);
        $helper.popConfirm($filter('translate')('REMIND'), $filter('translate')('DELETE_CART_MSG'), function(res) {
            if (res) {
                $scope.deleteEditCartItem(item);
            }
        });
    };

    $scope.deleteEditCartItem = function(item) {
        if (!$scope.editSku) {
            $scope.editSku = item.sku_no;
        }
        if (!$scope.editItemId) {
            $scope.editItemId = item.item_id;
        }
        console.log('rm sku:' + $scope.editSku + ', item:' + $scope.editItemId);
        if (item != null) {
            $scope.cartItem.id = item.id;
            $scope.cartItem.skuNo = item.sku_no;
        }
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'remove',
            invoice_id: $rootScope.currentInvoiceId,
            item_id: $scope.editItemId,
            product_id: item.id,
            sku_no: $scope.editSku,
            calling_type: 'f_b'
        }).then(function(res) {
            if (res.status == 'Y') {
                // $scope.loadProductDetail($scope.cartItem.id, $scope.cartItem.skuNo);
                $scope.loadCart();
                $scope.popoverBack();
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });
    };

    $scope.resetCartItem = function(item, spec, option) {
        option.selected = false;
        spec.options[0].selected = true;
        console.log(spec);
        console.log(option);
        console.log($scope.addOptions);
        console.log($scope.selectSpecifications);

        // reset options by select and generate spec
        $scope.addOptions = {};
        var i = 0;
        angular.forEach($scope.selectSpecifications, function(selectSpec) {
            angular.forEach(selectSpec.options, function(opt) {
                if (opt.selected == true) {
                    $scope.addOptions[i] = {
                        dictionary: selectSpec.dictionary,
                        option: opt.id
                    };
                }
                i++;
            });
        });
        var spec = [];
        angular.forEach($scope.addOptions, function(opt) {
            spec.push(opt);
        });
        console.log(spec);

        if (!$scope.editSku) {
            $scope.editSku = item.sku_no;
        }
        if (!$scope.editItemId) {
            $scope.editItemId = item.item_id;
        }
        console.log('reset sku:' + $scope.editSku + ', item:' + $scope.editItemId);
        $api.setCart({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            action: 'remove',
            invoice_id: $rootScope.currentInvoiceId,
            item_id: $scope.editItemId,
            product_id: item.id,
            sku_no: $scope.editSku,
            calling_type: 'f_b'
        }).then(function(res) {
            if (res.status == 'Y') {
                // $scope.loadProductDetail($scope.cartItem.id, $scope.cartItem.skuNo);
                // $scope.popoverBack();
                // $scope.addToCart(item);

                $api.setCart({
                    token: $localStorage.get('settings').token,
                    locale: $localStorage.get('settings').locale,
                    warehouse_id: $localStorage.get('user').warehouse_id,
                    action: 'add',
                    invoice_id: $rootScope.currentInvoiceId,
                    product_id: item.id,
                    qty: $scope.cartItem.qty,
                    spec: JSON.stringify(spec),
                    // currency: $scope.product.currency,
                    invoice_charges: angular.toJson($scope.cart.invoice_charges),
                    calling_type: 'f_b'
                }).then(function(res) {
                    if (res.status == 'Y') {
                        $scope.editSku = res.sku;
                        $scope.editItemId = res.item_id;
                        console.log(res);
                        console.log('addToCart sku:' + $scope.editSku + ', item:' + $scope.editItemId);
                        $scope.cart = res.data;
                        $scope.can_add = true;
                        for (var i = 0; i < $scope.cart.products.length; i++) {
                            //add to cart 后调出 edit cart
                            if ($scope.cart.products[i].id == item.id) {
                                $scope.cart.products[i].specifications = item.specifications;
                                // $scope.editCartItem($scope.cart.products[i], $event);
                            }
                        }
                        for (var i = 0; i < res.data.products.length; i++) {
                            if ($scope.editItemId == res.data.products[i].item_id) {
                                $scope.cartItem = res.data.products[i];
                                judgeStatus($scope.cartItem.served);
                                $scope.cartItem.qty = res.data.products[i].qty;
                            }
                        }
                        $scope.cart.temp_grand_total = $scope.cart.grand_total;
                        $scope.calculateCharge();

                        $scope.scrollCartToBottom();
                    } else {
                        $helper.toast(res.msg, 'short', 'bottom');
                        $scope.can_add = true;
                    }

                }).catch(function(err) {
                    $scope.can_add = true;
                    $helper.toast(err, 'long', 'bottom');
                });

            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });
    }

    // process checkout
    $scope.processCheckout = function(print_type, is_confirm) {
        console.log('print_type : ' + print_type + ', is_confirm : ' + is_confirm);
        if ($scope.cart.products.length < 1) {
            $helper.toast($translate.instant('THIS_CART_IS_EMPTY'), 'short', 'bottom');
            return;
        }
        if (is_confirm && $rootScope.currentPayment.id == 1) {
            if ($scope.receivedMoney.value < $scope.cart.temp_grand_total) {
                $helper.toast($translate.instant('RECEIVED_MONEY_WARN'), 'short', 'bottom');
                return;
            }
        }
        $helper.showLoading();
        var confirmParams = {
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            //       action: 'address',
            confirm: is_confirm ? 'y' : 'n',
            invoice_id: $rootScope.currentInvoiceId,
            pay_method: is_confirm ? $scope.currentPayment.name : '',
            payed_amount: is_confirm ? $scope.receivedMoney.value : 0,
            // delivery_type: $rootScope.currentOrderType.id==1?'direct sales':'pick up',
            delivery_type: 'direct sales',
            remark: $rootScope.currentOrderType.code,
            user_id: $rootScope.currentUserId == 0 ? null : $rootScope.currentUserId,
            invoice_charges: angular.toJson($scope.cart.invoice_charges)
        };
        var normalParams = {
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            warehouse_id: $localStorage.get('user').warehouse_id,
            invoice_id: $rootScope.currentInvoiceId,
            pay_method: is_confirm ? $scope.currentPayment.name : '',
            // delivery_type: $rootScope.currentOrderType.id==1?'direct sales':'pick up',
            delivery_type: 'direct sales',
            user_id: $rootScope.currentUserId == 0 ? null : $rootScope.currentUserId,
            invoice_charges: angular.toJson($scope.cart.invoice_charges)
        };
        var params;
        if (is_confirm) {
            params = confirmParams;
        } else {
            params = normalParams;

        }
        $api.checkOut(params).then(function(res) {
            console.log('process : ');
            console.log(JSON.stringify(res));
            if (res.status == 'Y') {
                $scope.pdfUrl = res.pdf;
                if ($rootScope.platform == 'web') {
                    $scope.pdfUrl = $sce.trustAsResourceUrl($scope.pdfUrl);
                } else {
                    var logo_img = $localStorage.get('local_icon');
                    console.log('1');
                    // if (is_confirm) {
                    //     if ($scope.viewConfirmBox) {
                    //         $scope.viewConfirmBox.back();
                    //     }
                    //     if ($rootScope.currentTable && $rootScope.currentTable.id != 0) {
                    //         $rootScope.tableOperation.removeInvoice($rootScope.currentTable.id, $rootScope.currentInvoiceId);
                    //     }
                    //     $rootScope.newCart();
                    // } else {
                    //     $translate.use($rootScope.currentPrintLang);
                    //     $scope.getImageToBase64(logo_img, res, print_type);
                    // }
                    $translate.use($rootScope.currentPrintLang);
                    $scope.getImageToBase64(logo_img, res, print_type, is_confirm);
                    console.log('3');
                }

            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }

        }).catch(function(err) {
            console.log(err);
            $helper.toast(err, 'long', 'bottom');
        });
    };

    $scope.getImageToBase64 = function(imgUrl, r, print_type, is_confirm) {
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

            var products = [];
            var i = 1;

            for (var j = 0; j < $scope.cart.products.length; j++) {
                var p = $scope.cart.products[j];
                if ((print_type == 'order' && p.served != 0) || (print_type == 'order_add' && p.served != 0)) {
                    continue;
                }
                if ((print_type == 'order' && p.served == 0) || (print_type == 'order_add' && p.served == 0) || (print_type == 'order_all' && p.served == 0)) {
                    $scope.cart.products[j].served = 2;
                }
                var options = ',';

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
            $scope.editCartServe();

            console.log($scope.cart.invoice_charges);

            var charges = [];
            angular.forEach($scope.cart.invoice_charges, function(c) {
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
            var qr = new QRious({ value: r.data.invoice_no });
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
            console.log($rootScope.yyyymmdd(currentTime));
            console.log(r.ticket_num);
            console.log(products);
            console.log(charges);
            console.log(r.customer_info);

            var invoice_option = '';
            if (print_type == 'order_all') {
                // invoice_option = $translate.instant('ADD_ORDER');
                print_type = 'order';
                invoice_option = $translate.instant('REPRINT');
            }
            if (print_type == 'order_add') {
                // invoice_option = $translate.instant('ADD_ORDER');
                print_type = 'order';
                invoice_option = $translate.instant('ADD_ORDER');
            }
            if (print_type != 'order' && $scope.cart.payed_amount == 0){
                invoice_option = $translate.instant('PRINT_INVOICE');
                print_type = 'receipt-nopay';
            }
            if (is_confirm) {
                invoice_option = $translate.instant('PRINT_RECEIPT');
                print_type = 'receipt';
            }
            // if take away then pay&print
            $offline.invoicePdf({
                size: '80mm', // '80mm',
                type: print_type, // 'receipt' or 'order',
                images: {
                    // COMPANY_LOGO: 'data:image/png;base64,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',
                    COMPANY_LOGO: dataURL,
                    INVOICE_QR: invoice_no_qr,
                    SHOP_QR: 'data:image/png;base64,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'
                },
                data: {
                    INVOICE_NO: r.data.invoice_no,
                    INVOICE_TITLE: print_type == 'receipt' ? $translate.instant('PRINT_RECEIPT') : $translate.instant('PRINT_INVOICE'),
                    MEMBER_CLASS: member_class,
                    // INVOICE_DATE: $rootScope.yyyymmdd(currentTime),
                    INVOICE_DATE: r.data.invoice_date,
                    TICKET_NO: r.ticket_num,
                    TABLE_NUM: $rootScope.currentOrderType.id == 1 ? $rootScope.currentTable.id : '-',
                    CUSTOMER_DETAIL: customer_detail,
                    DELIVERY_ADDRESS: '',
                    SALESMAN: $localStorage.get('user').login,
                    PRODUCT_ITEM: products,
                    CHARGE_ITEM: charges,
                    INVOICE_OPTION: invoice_option,
                    PAYMENT_METHOD: $translate.instant($scope.currentPayment.translateKey),
                    REMARKS: $translate.instant($scope.currentOrderType.translateKey),
                    ITEM_TOTAL: '$' + $scope.cart.item_total.toFixed(2),
                    GRAND_TOTAL: '$' + $scope.cart.temp_grand_total.toFixed(2),
                    // CASH_RECEIVED: '$' + $scope.receivedMoney.value.toFixed(2),
                    // CHANGES: '$' + $scope.changesMoney.toFixed(2),
                    CASH_RECEIVED: '$' + (Number(r.data.payed_amount) > 0 ? Number($scope.cart.temp_grand_total).toFixed(2) : '0.00'),
                    CHANGES: '$' + ((Number(r.data.payed_amount) - $scope.cart.temp_grand_total) > 0 ? (Number(r.data.payed_amount) - $scope.cart.temp_grand_total).toFixed(2) : '0.00'),
                    SHOP_NAME: $localStorage.get('user').name,
                    SHOP_TEL: '2625 1162',
                    SHOP_EMAIL: 'info@mushroom.hk',
                }

            }).then(function(res) {
                console.log(res);
                $scope.iframeUrl = 'templates/tpl.invoice-pdf.80mm.print.html';
                $scope.css = res.css;
                $scope.body = res.body;
                $scope.viewInvoiceC = {
                    iframe: null,
                    innerDoc: null,
                    css: res.css,
                    body: res.body,
                    back: function() {
                        $scope.iframeModal.hide();
                        // $scope.iframeModal.remove();

                        if ($scope.viewConfirmBox) {
                            $scope.viewConfirmBox.back();
                        }
                        if (is_confirm) {
                            if ($rootScope.currentTable && $rootScope.currentTable.id != 0) {
                                $rootScope.tableOperation.removeInvoice($rootScope.currentTable.id, $rootScope.currentInvoiceId);
                            }
                            $rootScope.newCart();
                        }

                        $translate.use($rootScope.currentLang);
                    },
                    print: function() {
                        $scope.viewInvoiceC.iframe.contentWindow.print($localStorage.get('settings').epson_ip_address, $localStorage.get('settings').epson_port, $localStorage.get('settings').epson_device_id);
                    }
                };
                if ($scope.iframeModal) {
                    $scope.iframeModal.remove();
                }
                $ionicModal.fromTemplateUrl('templates/modal.iframe.html', {
                    scope: $scope,
                    animation: 'none',
                    hardwareBackButtonClose: false
                }).then(function(modal) {
                    $scope.iframeModal = modal;
                    if (!modal.isShown())
                        modal.show().then(function() {
                            $helper.showLoading(1000);
                            $scope.viewInvoiceC.iframe = document.getElementById('iframe-printer');
                            $scope.viewInvoiceC.innerDoc = $scope.viewInvoiceC.iframe.contentDocument || $scope.viewInvoiceC.iframe.contentWindow.document;
                            $scope.viewInvoiceC.innerDoc.getElementById('css-wrapper').innerHTML = $scope.viewInvoiceC.css;
                            $scope.viewInvoiceC.innerDoc.getElementById('html-wrapper').innerHTML = $scope.viewInvoiceC.body;
                            /*var iframe = document.getElementById('iframe-printer');
                            var innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                            console.log(innerDoc.getElementById('css-wrapper').innerHTML);
                            innerDoc.getElementById('css-wrapper').innerHTML = res.css;
                            console.log(innerDoc.getElementById('html-wrapper').innerHTML);
                            innerDoc.getElementById('html-wrapper').innerHTML = res.body;
                            iframe.contentWindow.print('192.168.200.39', '8008', 'local_printer');*/
                            $scope.viewInvoiceC.iframe.contentWindow.print($localStorage.get('settings').epson_ip_address, $localStorage.get('settings').epson_port, $localStorage.get('settings').epson_device_id);
                        });
                });
            }).catch(function(err) {
                alert('fail');
            });
        };

    };

    // load invoice detail
    $scope.loadOutDetail = function(pdf) {

        $scope.pdfUrl = pdf;
        if ($rootScope.platform == 'web') {
            $scope.pdfUrl = $sce.trustAsResourceUrl($scope.pdfUrl);
        }
        $scope.viewInvoiceC = {
            mode: 'orderHistory',
            back: function() {
                $scope.processCheckoutModal.hide();
                $scope.processCheckoutModal.remove();
            }
        };
        $ionicModal.fromTemplateUrl('templates/modal.view-invoice.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.processCheckoutModal = modal;
            modal.show();
        });

    };

    $scope.printerConfig = {
        popPrinterList: function() {
            $ionicModal.fromTemplateUrl('templates/modal.select-printer.html', {
                scope: $scope,
                animation: 'slide-in-right'
            }).then(function(modal) {

                if (!$scope.printerList) {
                    $scope.printerList = [];
                    $scope.printerList.push($translate.instant('OTHER'));
                    $scope.printerList.push($translate.instant('EPSON_THERMAL_PRINTER'));
                    $scope.printerList.push($translate.instant('SKIP_PRINT'));
                }
                $scope.processModal = modal;

                modal.show();
            });
        },
        back: function() {

            $scope.processModal.hide();
            $scope.processModal.remove();
        },
    };

    $scope.selectPrinter = function(printer) {
        if (printer == $translate.instant('SKIP_PRINT')) {
            $scope.printerConfig.back();
            $scope.popConfirmDialog();
            return;
        }
        var settings = $localStorage.get('settings');
        settings.printer_type = printer;
        $localStorage.set('settings', settings);
        $scope.printerType = printer;
        console.log($scope.printerType);
        $scope.printerConfig.back();
        $scope.popConfirmDialog();

        if ($localStorage.get('settings').printer_type == $translate.instant('OTHER')) {
            // helper print
            $helper.print($scope.pdfUrl);

        } else {
            // epson print
            if ($rootScope.networkResult) {
                $api.epsonPrint($scope.currentInvoiceId);

            } else {
                $scope.viewInvoiceC.iframe.contentWindow.print($localStorage.get('settings').epson_ip_address, $localStorage.get('settings').epson_port, $localStorage.get('settings').epson_device_id);
                // $scope.viewInvoiceC.iframe.contentWindow.print('192.168.200.39', '8008', 'local_printer');
            }

        }
    };

    // print invoice
    $scope.printHistory = function() {

        if ($rootScope.platform == 'web') {

            $scope.popConfirmDialog();

            window.open($scope.pdfUrl, '_system', 'location=yes');
        } else {
            // TODO: handle app printing
            if ($localStorage.get('settings').cloud_address != '' && $localStorage.get('settings').cloud_lock) {
                // cloud print
                console.log('cloud print :' + $rootScope.currentInvoiceId);

                $scope.popConfirmDialog();
                $ionicLoading.show({
                    template: '<ion-spinner icon="lines"></ion-spinner>',
                    noBackdrop: false
                });

                $api.cloudPrint({
                    token: $localStorage.get('settings').token,
                    locale: $localStorage.get('settings').locale,
                    warehouse_id: $localStorage.get('user').warehouse_id,
                    calling_from: 'pos',
                    invoice_id: $rootScope.currentInvoiceId,
                    email_address: $localStorage.get('settings').cloud_address
                }).then(function(res) {
                    if (res.status == 'Y') {
                        $ionicLoading.hide();
                    } else {
                        $helper.toast(res.msg, 'short', 'bottom');
                    }
                }).catch(function(err) {
                    $helper.toast(err, 'long', 'bottom');
                });

            } else {
                $scope.printerConfig.popPrinterList();
            }
        }

    };

    $rootScope.loadCustomerList = function(mode, keyword) {
        console.log('load customer list!!!' + mode + ',' + keyword);
        if (mode != 'more' || $rootScope.customerList == undefined) {
            $scope.customerLimitFrom = 0;
            $scope.customerLimit = 20;
            $rootScope.customerCount = 0;
        } else {
            $scope.customerLimitFrom += 20;
        }

        $api.getMemberList({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            keyword: keyword != undefined ? keyword : null,
            limit_from: $scope.customerLimitFrom,
            limit: $scope.customerLimit
        }).then(function(res) {
            if (mode != 'more' || $rootScope.customerList == undefined) {
                $rootScope.customerList = [];
            }
            if (res.status == 'Y') {
                $rootScope.customerCount = res.member.count;
                for (var i = 0; i < res.member.list.length; i++) {
                    res.member.list[i].prefix = $localStorage.get('user').invoice_prefix;
                    $rootScope.customerList.push(res.member.list[i]);
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

    //change big photo in shop detail
    $scope.changeBigPhoto = function(photo) {
        $scope.bigPhoto = photo;
    };
    $scope.confirmPayment = function() {

        $api.confirmPayment({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            invoice_id: $rootScope.currentInvoiceId
        }).then(function(res) {
            if (res.status == 'Y') {
                if ($scope.viewConfirmBox) {
                    $scope.viewConfirmBox.back();
                }
                if ($rootScope.currentTable && $rootScope.currentTable.id != 0) {
                    $rootScope.tableOperation.removeInvoice($rootScope.currentTable.id, $rootScope.currentInvoiceId);
                }
                $rootScope.newCart();

            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }
        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });


    };
    //click pay and print
    $scope.payAndPrint = function() {
        // if ($rootScope.platform != 'web')
        $scope.printHistory();
    };

    $scope.popConfirmDialog = function() {
        if ($scope.cart.products.length == 0) {
            $helper.toast($translate.instant('THIS_CART_IS_EMPTY'), 'short', 'bottom');
            return;
        }
        if ($scope.cart.payed_amount > 0) {
            $helper.toast($translate.instant('THIS_CART_IS_PAYED'), 'long', 'bottom');
            return;
        }
        // if ($rootScope.currentPayment.id == 0) {
        //     $helper.toast($translate.instant('NO_PAYMENT_WARN'), 'short', 'bottom');
        //     return;
        // }
        if ($rootScope.currentPayment.id == 1) {
            if ($scope.receivedMoney.value < $scope.cart.temp_grand_total) {
                $helper.toast($translate.instant('RECEIVED_MONEY_WARN'), 'short', 'bottom');
                return;
            }
        }
        $scope.viewConfirmBox = {
            back: function() {
                $scope.ConfirmBoxModal.hide();
                $scope.ConfirmBoxModal.remove();
            }
        };
        $ionicModal.fromTemplateUrl('templates/modal.confirm-box.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.ConfirmBoxModal = modal;
            modal.show();
        });

    };

    $scope.popClearDialog = function() {
        if ($scope.cart.payed_amount > 0) {
            $helper.toast($translate.instant('THIS_CART_IS_PAYED'), 'long', 'bottom');
            return;
        }
        if ($scope.cart.products.length > 0) {
            $scope.viewClearBox = {
                back: function() {
                    $scope.ClearBoxModal.hide();
                    $scope.ClearBoxModal.remove();
                }
            };
            $ionicModal.fromTemplateUrl('templates/modal.confirm-clear-box.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $scope.ClearBoxModal = modal;
                modal.show();
            });
        } else {
            $helper.toast($translate.instant('THIS_CART_IS_EMPTY'), 'short', 'bottom');
        }

    };
    //function copy from controller.pickup

    $scope.myDate = $filter('date')(new Date(), 'yyyy-MM-dd HH:mm:ss');

    $scope.processPickup = function(invoice_id) {
        $api.getInvoiceDetail({
            token: $localStorage.get('settings').token,
            locale: $localStorage.get('settings').locale,
            invoice_id: invoice_id,
            calling_type: 'f_b'
        }).then(function(res) {
            if (res.status == 'Y') {
                $scope.invoiceDetail = res.data;
                $scope.productDetail = [];
                for (var i = 0; i < res.data.products.length; i++) {
                    $scope.productDetail.push(res.data.products[i]);
                    $scope.productDetail[i].actual_pickup_qty = $scope.productDetail[i].can_pick_qty;
                }
            } else {
                $helper.toast(res.msg, 'short', 'bottom');
            }

        }).catch(function(err) {
            $helper.toast(err, 'long', 'bottom');
        });

        $scope.viewInvoice = {
            title: 'PICK_UP_ORDER',
            back: function() {
                $scope.processPickUpModal.hide();
                $scope.processPickUpModal.remove();
                //$scope.processCheckoutModal.show();
            },
            canvasback: function() {
                console.log('back');
                $scope.drawingCanvasModal.hide();
                $scope.drawingCanvasModal.remove();
            },
            drawCanvas: function() {
                if ($scope.drawingCanvasModal != null) {
                    $scope.drawingCanvasModal.remove();
                }
                $ionicModal.fromTemplateUrl('templates/modal.drawing-canvas.html', {
                    scope: $scope,
                    animation: 'none',
                    backdropClickToClose: false
                }).then(function(modal) {
                    $scope.drawingCanvasModal = modal;
                    modal.show();
                    var canvas = document.getElementById('signatureCanvas');
                    $scope.signaturePad = new SignaturePad(canvas);

                    $scope.clearCanvas = function() {
                        signaturePad.clear();
                    }

                    $scope.saveCanvas = function() {
                        var sigImg = signaturePad.toDataURL();
                        $scope.signature = sigImg;
                    }
                });

            },
            next: function() {

                $scope.processCheckoutModal.hide();
                $scope.processCheckoutModal.remove();

                $scope.signaturepng = $scope.signaturePad.toDataURL('image/png');
                $scope.drawingCanvasModal.hide();
                $scope.drawingCanvasModal.remove();
                $scope.productjson = [];
                angular.forEach($scope.invoiceDetail.products, function(spec) {
                    if (spec.checkboxValue) {
                        $scope.productjson.push({ "sku_no": spec.sku_no, "qty": spec.actual_pickup_qty });
                    }
                });



                $api.confirmPickUp({
                    token: $localStorage.get('settings').token,
                    locale: $localStorage.get('settings').locale,
                    warehouse_id: $localStorage.get('user').warehouse_id,
                    invoice_id: invoice_id,
                    products: JSON.stringify($scope.productjson)
                }).then(function(res) {
                    if (res.status == 'Y') {

                        $scope.viewInvoice.back();


                    } else {
                        $helper.toast(res.msg, 'short', 'bottom');

                    }

                    $scope.viewInvoiceC = {
                        mode: $scope.deliveryTypeData.deliveryType,
                        back: function() {

                            $scope.processCheckoutModal.hide();
                            $scope.processCheckoutModal.remove();
                        }
                    };
                    $ionicModal.fromTemplateUrl('templates/modal.view-invoice.html', {
                        scope: $scope,
                        animation: 'slide-in-up'
                    }).then(function(modal) {
                        $scope.processCheckoutModal = modal;


                        modal.show();
                    });

                }).catch(function(err) {
                    $helper.toast(err, 'long', 'bottom');
                });


                //upload photo

                $api.uploadMedia($scope.signaturepng, {
                    token: $localStorage.get('settings').token,
                    locale: $localStorage.get('settings').locale,
                    invoice_id: invoice_id,
                    type: 'photo',
                    sign_type: 'pick up'
                }).then(function(res) {
                    if (res.status == 'Y') {


                    } else {
                        $helper.toast(res.msg, 'short', 'bottom');
                    }
                }).catch(function(err) {
                    $helper.toast(err, 'long', 'bottom');
                });

                $scope.processCheckoutModal.hide();
                $scope.processCheckoutModal.remove();


            }
        };


        $ionicModal.fromTemplateUrl('templates/modal.view-invoice-change.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.processPickUpModal = modal;

            $scope.partial_pick = true;
            modal.show();

        });
    };

    $scope.minus = function(product, qty, zero) {
        if (qty > zero) {
            product.actual_pickup_qty = product.actual_pickup_qty - 1;

        }
    };

    $scope.add = function(product, qty, max) {
        if (qty < max) {
            product.actual_pickup_qty = product.actual_pickup_qty + 1;
            console.log('+');
        }
    };

    $scope.confirm_button = false;
    $scope.can_confirm = $scope.confirm_button;
    $scope.confirm_count = 0;

    $scope.change_button = function(value) {


        if ($scope.confirm_button == false && value == true) {
            $scope.confirm_count = $scope.confirm_count + 1;
            $scope.confirm_button = true;

        } else if ($scope.confirm_button == true && value == false) {
            $scope.confirm_count = $scope.confirm_count - 1;
            if ($scope.confirm_count == 0)
                $scope.confirm_button = false;

        } else if ($scope.confirm_button == true && value == true) {
            $scope.confirm_count = $scope.confirm_count + 1;

        }
        $scope.can_confirm = $scope.confirm_button;

    };

    $scope.checkQty = function(product, qty, max) {
        if (qty < 0)
            product.actual_pickup_qty = 0;
        else if (qty > max)
            product.actual_pickup_qty = max;


    };

    $scope.partialPickUp = function() {
        $scope.processPickup($rootScope.currentInvoiceId);
    };

    //update the amount on the right
    $scope.updateAmount = function(field) {

        switch (field) {
            case 'carryUp':
                break;
            case '':
        }

    };


    var checkUndefined = function() {
        Object.keys($scope.deliveryTypeData).map(function(objectKey, index) {
            var value = $scope.deliveryTypeData[objectKey];
            if (typeof value == "undefined") {
                $scope.deliveryTypeData[objectKey] = '';
            }
        });
    };

    $scope.popUpDate = function() {
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
                $scope.deliveryTypeData.deliveryDate = [year, month, day].join('-');
                $scope.selectHour($scope.deliveryTypeData.deliveryDate);
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
    };

    $scope.selectHour = function(dateStr) {
        $scope.from = 0;
        $scope.to = 0;
        $scope.hourInfo = [];
        for (var i = 0; i < 24; i++) {
            $scope.hourInfo.push({
                title: i < 10 ? '0' + i + ':00' : '' + i + ':00',
                value: i,
                checked: $scope.from == i
            });
        }
        $scope.hourPicker = {
            modalConfirm: function() {
                var hourStr = ($scope.from < 10 ? '0' + $scope.from : $scope.from) + ':00-' + ($scope.to < 10 ? '0' + $scope.to : $scope.to) + ':00'
                $scope.deliveryTypeData.deliveryDate = dateStr + ' ' + hourStr;
                $scope.processModal.hide();
                $scope.processModal.remove();
            },
            modalBack: function() {
                $scope.processModal.hide();
                $scope.processModal.remove();
            },
            chooseFrom: function(index) {
                $scope.from = index;
            },
            chooseTo: function(index) {
                $scope.to = index;
            },
        };
        $ionicModal.fromTemplateUrl('templates/modal.time-picker.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.processModal = modal;
            modal.show();
        });
    };



    $scope.popUpDiscount = function(productInfo) {
        $ionicModal.fromTemplateUrl('templates/modal.select-discount.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.currentDiscount = {};
            $scope.discountModal = modal;
            $scope.selectedProduct = productInfo;
            $scope.currentDiscount.val = Math.abs((productInfo.unit_price - productInfo.o_price) * 100 / productInfo.o_price);
            modal.show();
        });
    };



    $scope.cancelDiscount = function() {
        $scope.discountModal.hide();
        $scope.discountModal.remove();
    };

    $scope.saveDiscount = function(form) {
        if (!form.$valid) {

            angular.forEach(document.getElementsByClassName('error-container'), function(el) {
                if (angular.element(el).text().trim() != '') {
                    $ionicScrollDelegate.$getByHandle('form-error').scrollTo(0, el.getBoundingClientRect().top, true);
                }
            });
        } else {

            $api.setCart({
                token: $localStorage.get('settings').token,
                locale: $localStorage.get('settings').locale,
                warehouse_id: $localStorage.get('user').warehouse_id,
                action: 'update',
                qty: $scope.selectedProduct.qty,
                invoice_id: $rootScope.currentInvoiceId,
                extra_discount: $scope.currentDiscount.val,
                sku_no: $scope.selectedProduct.sku_no,
                invoice_charges: angular.toJson($scope.cart.invoice_charges),
                calling_type: 'f_b'
            }).then(function(res) {
                if (res.status == 'Y') {
                    $scope.cart = res.data;
                    var tempTotal = 0;
                    for (var i = 0; i < $scope.cart.products.length; i++) {
                        tempTotal += $scope.cart.products[i].sub_total;
                    }
                    $scope.cart.item_total = tempTotal;
                    $scope.calculateCharge();
                } else {
                    $helper.toast(res.msg, 'long', 'bottom');
                }
            }).catch(function(err) {
                $helper.toast(err, 'long', 'bottom');
            });
            $scope.discountModal.hide();
            $scope.discountModal.remove();
        }

    };


    $scope.changeCharge = function(index) {
        var charge = $scope.otherCharges[index];



        for (var i = 0; i < $scope.cart.invoice_charges.length; i++) {
            var iCharge = $scope.cart.invoice_charges[i];
            if (iCharge.title_EN_US == charge.title_EN_US && iCharge.type == charge.type && iCharge.value_type == charge.value_type) {
                $scope.cart.invoice_charges[i].value = charge.value;
                break;
            }
        }
        $scope.calculateCharge();
    };

    $scope.clickChargeItem = function(index) {
        $scope.chargeStatus[index] = !$scope.chargeStatus[index];
        if ($scope.chargeStatus[index]) {
            $scope.cart.invoice_charges.push($scope.otherCharges[index]);
        } else {
            var char = $scope.otherCharges[index];
            for (var i = 0; i < $scope.cart.invoice_charges.length; i++) {
                var iChar = $scope.cart.invoice_charges[i];
                if (char.title_EN_US == iChar.title_EN_US && char.type == iChar.type && char.value_type == iChar.value_type) {
                    $scope.cart.invoice_charges.splice(i, 1);
                    break;
                }
            }
        }
        $scope.calculateCharge();

    };

    $scope.clickChargeInput = function(index) {
        console.log($scope.chargeStatus[index]);
        if ($scope.chargeStatus[index] == false) {
            $scope.clickChargeItem(index);
        }
    };

    $scope.calculateCharge = function() {
        var baseTotal = $scope.cart.item_total;
        var baseDiscount = 0;
        var baseCharge = 0;
        console.log('basetotal : ' + baseTotal);


        for (var i = 0; i < $scope.cart.invoice_charges.length; i++) {
            var charge = $scope.cart.invoice_charges[i];
            if (charge.value_type == 'percent') {
                if (charge.sign == '+') {
                    //service charge
                    var totalFlag = baseTotal;
                    baseTotal *= 1 + Number(charge.value) / 100;
                    baseCharge += baseTotal - totalFlag;
                } else if (charge.sign == '-') {
                    //discount

                    var totalFlag = baseTotal;
                    baseTotal *= 1 - Number(charge.value) / 100;
                    baseDiscount += totalFlag - baseTotal;
                }
            }
        }

        for (var i = 0; i < $scope.cart.invoice_charges.length; i++) {
            var charge = $scope.cart.invoice_charges[i];
            if (charge.value_type != 'percent') {

                if (charge.sign == '+') {
                    //service charge
                    var totalFlag = baseTotal;
                    baseTotal += Number(charge.value);
                    baseCharge += baseTotal - totalFlag;

                } else if (charge.sign == '-') {
                    //discount
                    var totalFlag = baseTotal;
                    baseTotal -= Number(charge.value);
                    baseDiscount += totalFlag - baseTotal;
                }
            }
        }

        if ($scope.cart.delivery_type == 'shipping') {
            $scope.cart.service_total = baseCharge + $scope.cart.carry_up * 100;
        } else {
            $scope.cart.service_total = baseCharge;
        }
        $scope.cart.discount_total = baseDiscount;
        // console.log('计完chargeList  baseTotal：' + baseTotal + '    delivery_total: ' + $scope.cart.delivery_total + '    refund_total: ' + $scope.cart.refund_total + '     service_total: ' + $scope.cart.service_total);
        $scope.cart.temp_grand_total = $scope.cart.item_total - $scope.cart.discount_total + Number($scope.cart.delivery_total) - Number($scope.cart.refund_total) + Number($scope.cart.service_total);

        if ($scope.cart.temp_grand_total < 0) {
            $scope.cart.temp_grand_total = 0;
        }
        $scope.setTempTotal($scope.cart.temp_grand_total);
    };

    $scope.afterEditDiscountTotal = function() {
        $scope.cart.temp_grand_total = $scope.cart.item_total - $scope.cart.discount_total + Number($scope.cart.delivery_total) - Number($scope.cart.refund_total) + Number($scope.cart.service_total);
        $scope.setTempTotal($scope.cart.temp_grand_total);
    };

    $scope.setTempTotal = function(total) {
        $scope.cart.temp_grand_total = total;
        $scope.receivedMoney = { value: $scope.cart.temp_grand_total };
        $scope.changesMoney = $scope.receivedMoney.value - $scope.cart.temp_grand_total;
    };

    $scope.calculateOptions = function(option) {
        var baseTotal = $scope.cart.item_total;
        var baseDiscount = 0;
        var baseCharge = 0;
        console.log('basetotal : ' + baseTotal);
        console.log(option);

        if (option.selected) {
            if (option.sign == '+') {
                //service charge
                var totalFlag = baseTotal;
                $scope.cart.temp_grand_total += Number(option.value);
                $scope.cart.service_total += Number(option.value);

            } else if (option.sign == '-') {
                //discount
                var totalFlag = baseTotal;
                $scope.cart.temp_grand_total -= Number(option.value);
                $scope.cart.discount_total += Number(option.value);
            }
        } else {
            if (option.sign == '+') {
                //service charge
                var totalFlag = baseTotal;
                $scope.cart.temp_grand_total -= Number(option.value);
                $scope.cart.service_total += Number(option.value);

            } else if (option.sign == '-') {
                //discount
                var totalFlag = baseTotal;
                $scope.cart.temp_grand_total += Number(option.value);
                $scope.cart.discount_total += Number(option.value);
            }
        }

        if ($scope.cart.temp_grand_total < 0) {
            $scope.cart.temp_grand_total = 0;
        }
        $scope.setTempTotal($scope.cart.temp_grand_total);
    };

    $scope.editInput = function() {};
    $scope.popCurrency = function() {
        var options = [];
        var currencyList = $localStorage.get('currency');
        angular.forEach(currencyList, function(dic) {
            options.push({
                name: dic.title,
                value: dic.title,
                checked: $scope.currencyData.currency == dic.title,
                data: dic
            });
        });
        $helper.picker({
            scope: $scope,
            title: 'SELECT_TITLE',
            options: options,
            multiple: false,
            confirmCallback: function(selectedObjs) {
                var selectObj = selectedObjs[0];
                $scope.currencyData.currency = selectObj.name;
                $scope.currencyData.value = selectObj.data.value;
                $scope.cart.currency = selectObj.name;
                if (selectObj.name != 'HKD') {
                    var currencyStr = '(' + selectObj.name + '): ' + $scope.cart.grand_total * Number(selectObj.data.value) + '\n';
                    if ($scope.deliveryTypeData.remark.startsWith('(') && $scope.deliveryTypeData.remark.includes('):')) {
                        var remarkList = $scope.deliveryTypeData.remark.split('\n');
                        if (remarkList.shift() != '') {
                            $scope.deliveryTypeData.remark = remarkList.join('\n');
                        } else {
                            $scope.deliveryTypeData.remark = '';
                        }
                    }
                    $scope.deliveryTypeData.remark = currencyStr + $scope.deliveryTypeData.remark;
                } else {
                    if ($scope.deliveryTypeData.remark.startsWith('(') && $scope.deliveryTypeData.remark.includes('):')) {
                        var remarkList = $scope.deliveryTypeData.remark.split('\n');
                        if (remarkList.shift() != '') {
                            $scope.deliveryTypeData.remark = remarkList.join('\n');
                        } else {
                            $scope.deliveryTypeData.remark = '';
                        }
                    }
                }
                $scope.cart.remark = $scope.deliveryTypeData.remark;
            }
        });

    };


    $scope.showPhotosGallery = function() {
        var photos = [];
        var photoIndex = 0;
        for (var i = 0; i < $scope.product.photos.length; i++) {
            if ($scope.product.photos[i] != '') {
                console.log($scope.product.photos[i].replace('/small/', '/large/'));
                photos.push($scope.product.photos[i].replace('/small/', '/large/'));
                if ($scope.bigPhoto == $scope.product.photos[i]) {
                    photoIndex = i;
                }
            }
        }
        $helper.gallery({
            scope: $scope,
            photos: photos,
            zoomMin: 1,
            activeSlide: photoIndex
        });
    };


    /* ------------     current cart function    -----------*/
    // current cart popover
    $scope.editDiscount = {
        popoverEditDiscount: function($event) {
            $scope.tempDiscountString = $scope.cart.discount_total.toString();
            $scope.discountButtonList = [
                [{ name: '1', value: 1 }, { name: '2', value: 2 }, { name: '3', value: 3 }],
                [{ name: '4', value: 4 }, { name: '5', value: 5 }, { name: '6', value: 6 }],
                [{ name: '7', value: 7 }, { name: '8', value: 8 }, { name: '9', value: 9 }],
                [{ name: '.', value: '.' }, { name: '0', value: 0 }, { name: 'X', value: 'X' }],
                [{ name: 'Delete', value: 'Delete' }, { name: '$', value: '$' }, { name: '%', value: '%' }]
            ];
            console.log($scope.discountButtonList);
            $ionicPopover.fromTemplateUrl('templates/popover.EditDiscount.html', {
                scope: $scope
            }).then(function(popover) {
                $scope.discountPopover = popover;
                popover.show($event);
            });
        },
        click: function(clickValue) {
            switch (clickValue) {
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                case 8:
                case 9:
                case 0:
                    if ($scope.tempDiscountString == '0') $scope.tempDiscountString = '';
                    $scope.tempDiscountString = $scope.tempDiscountString.concat(clickValue.toString());
                    break;
                case 'X':
                    $scope.tempDiscountString = $scope.tempDiscountString.substring(0, $scope.tempDiscountString.length - 1);
                    if ($scope.tempDiscountString == null || $scope.tempDiscountString == '') $scope.tempDiscountString = '0';
                    break;
                case 'Delete':
                    $scope.tempDiscountString = '0';
                    break;
                case '.':
                    if ($scope.tempDiscountString.indexOf('.') == -1) {
                        $scope.tempDiscountString = $scope.tempDiscountString.concat(clickValue);
                    }
                    break;
                case '$':
                    $scope.cart.discount_total = Number($scope.tempDiscountString);
                    $scope.afterEditDiscountTotal();
                    $scope.discountPopover.hide();
                    $scope.discountPopover.remove();
                    break;
                case '%':
                    $scope.cart.discount_total = Number($scope.tempDiscountString) * 0.01 * $scope.cart.item_total;
                    $scope.afterEditDiscountTotal();
                    $scope.discountPopover.hide();
                    $scope.discountPopover.remove();
                    break;
                default:
                    break;
            }
            console.log('discount result: ' + $scope.tempDiscountString);
        }
    };



    $scope.editOtherCharge = {
        popoverOtherCharge: function($event, isDiscount) {
            console.log('~~~~');
            if ($scope.cart.payed_amount > 0) {
                $helper.toast($translate.instant('THIS_CART_IS_PAYED'), 'long', 'bottom');
                return;
            }
            if ($scope.cart.products.length < 1) {
                $helper.toast($translate.instant('THIS_CART_IS_EMPTY'), 'short', 'bottom');
                return;
            }
            $scope.showOtherCharge = true;
            // $ionicPopover.fromTemplateUrl('templates/popover.other-charge.html', {
            //     scope: $scope
            // }).then(function(popover) {
            //     $scope.otherChargePopover = popover;
            //     popover.show($event);
            // });            

            $scope.isDiscount = isDiscount;
            if ($scope.isDiscount) {
                $scope.popoverTitle = $translate.instant('DISCOUNT_TOTAL');
            } else {
                $scope.popoverTitle = $translate.instant('SERVICE_TOTAL');
            }
            console.log($scope.popoverTitle);

            $scope.chargeStatus = [];
            $scope.otherCharges = $localStorage.get('charges') != null ? $localStorage.get('charges') : [];
            for (var index = 0; index < $scope.otherCharges.length; index++) {
                var charge = $scope.otherCharges[index];
                var trueTag = false;
                if ($scope.cart.invoice_charges == null) {
                    $scope.cart.invoice_charges = [];
                }
                for (var i = 0; i < $scope.cart.invoice_charges.length; i++) {
                    var iCharge = $scope.cart.invoice_charges[i];
                    if (iCharge.title_EN_US == charge.title_EN_US && iCharge.type == charge.type && iCharge.value_type == charge.value_type) {
                        $scope.otherCharges[index].value = iCharge.value;
                        $scope.chargeStatus.push(true);
                        trueTag = true;
                        break;
                    }
                }
                if (!trueTag) {
                    $scope.chargeStatus.push(false);
                }
            }
        }
    };

    $scope.dragCart = function() {
        console.log('drag cart');
        $scope.glued = false;
    };



    $scope.editPayType = {
        //payment的pop方法
        popoverPaymentType: function($event) {
            if ($scope.cart.payed_amount > 0) {
                $helper.toast($translate.instant('THIS_CART_IS_PAYED'), 'long', 'bottom');
                return;
            }
            $scope.showPaymentMethod = true;
            $scope.selectMoney = [100, 300, 500];
            $scope.clickMoney = $scope.cart.temp_grand_total;
            // //控制错误信息
            $scope.receivedLess = $scope.receivedMoney.value < $scope.cart.temp_grand_total;
        },
        clickReceivedMoney: function(num) {
            $scope.clickMoney = num;
            $scope.editPayType.changeReceivedMoney(num);
        },
        changeReceivedMoney: function(num) {
            $scope.receivedLess = (num < $scope.cart.temp_grand_total);
            $scope.receivedMoney.value = num;
            $scope.changesMoney = num - $scope.cart.temp_grand_total;
            if ($scope.changesMoney < 0) {
                $scope.changesMoney = 0;
            }
        },
        choosePayment: function(paymentInfo) {
            $rootScope.currentPayment = paymentInfo;
            if ($scope.orderTypeExpand == null) $scope.orderTypeExpand = false;
            $scope.orderTypeExpand = !$scope.orderTypeExpand;
            // $scope.hidePopoverAction('payment');
        },
        //OrderType的pop方法   
        popoverOrderType: function($event) {
            $scope.showOrderType = true;
        },
        chooseOrderType: function(orderType) {
            $scope.hidePopoverAction('orderType');
            if (orderType.id == 1) {
                $rootScope.tableOperation.showOrHide(true);
            } else {
                if ($rootScope.currentOrderType.id == orderType.id) {
                    return;
                }
                $rootScope.currentOrderType = orderType;
                $rootScope.setTableNum(0);
                $rootScope.tableOperation.removeInvoice($scope.cart.table_num, $rootScope.currentInvoiceId);
            }
        },
        //PrintType的pop方法   
        popoverPrintType: function($event) {
            if ($scope.cart.products.length < 1) {
                $helper.toast($translate.instant('THIS_CART_IS_EMPTY'), 'short', 'bottom');
                return;
            }
            var served = [];
            angular.forEach($scope.cart.products, function(product) {
                served.push({
                    item_id: product.item_id,
                    served: product.served
                });
            });
            if (served.every($scope.checkEveryServed)) {
                console.log('Print All served');
                $scope.processCheckout('order_all', false);

            } else if (served.every($scope.checkEveryNotServed)) {
                console.log('Print All not served');
                $scope.processCheckout('order', false);

            } else {
                $scope.showPrintType = true;

            }
        },
        choosePrintType: function(printType) {
            $scope.hidePopoverAction('printType');
            if (printType.id == '1') {
                $scope.processCheckout('order_add', false);
            } else {
                $scope.processCheckout('order_all', false);
            }

        }
    };
    $scope.hidePopoverAction = function(type) {
        switch (type) {
            case 'charge':
                $scope.showOtherCharge = false;
                break;
            case 'payment':
                $scope.showPaymentMethod = false;
                break;
            case 'orderType':
                $scope.showOrderType = false;
                break;
            case 'printType':
                $scope.showPrintType = false;
                break;
            default:
                break;
        }
    };

    var judgeStatus = function(productServe) {
        for (var i = 0; i < $scope.serveStatus.length; i++) {
            if ($scope.serveStatus[i].id == productServe) {
                $scope.currentServeStatus = $scope.serveStatus[i];
                break;
            }
        }
    };

    /**************************************************
    // finally
    **************************************************/

    $scope.$on('$ionicView.beforeLeave', function() {
        if ($scope.salesState == 'checkout') {
            console.log('leave check out load cart~');
            updateCartInCheckout();
        }
    });


    // make the view re-init data on enter
    $scope.$on('$ionicView.enter', function() {
        $scope.init();
    });

    $scope.$on('$ionicView.loaded', function() {
        $rootScope.newCart();
    });

    $scope.resetCountry = function() {

    };

    $scope.activeSlide = function(index) { //点击时候触发
        $scope.slectIndex = index;
        $ionicSlideBoxDelegate.slide(index);
    };

    $scope.slideChanged = function(index) { //滑动时候触发
        console.log('slide~~~~' + index);
        $scope.slectIndex = index;
    };

    $scope.$on('changeLanguage', function(event, args) {

    });

}).filter('numberFixedLen', function() {
    return function(n, len) {
        var num = parseInt(n, 10);
        len = parseInt(len, 10);
        if (isNaN(num) || isNaN(len)) {
            return n;
        }
        num = '' + num;
        while (num.length < len) {
            num = '0' + num;
        }
        return num;
    };
}).filter('cartOptionsFormat', function() {
    return function(x) {
        var txt = '';
        if (x > 0) {
            txt = ', ';
        }
        return txt;
    };
});;
