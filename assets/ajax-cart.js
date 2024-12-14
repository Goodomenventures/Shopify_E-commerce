if ((typeof ShopifyAPI) === 'undefined') { ShopifyAPI = {}; }

function attributeToString(attribute) {
    if ((typeof attribute) !== 'string') {
        attribute += '';
        if (attribute === 'undefined') {
            attribute ='';
        }
    }
    return jQuery.trim(attribute);
};

ShopifyAPI.onCartUpdate = function(cart) {
};

ShopifyAPI.updateCartNote = function(note, callback) {
    var params = {
        type: 'POST',
        url: '/cart/update.js',
        data: 'note=' + attributeToString(note),
        dataType: 'json',
        success: function(cart) {
            if ((typeof callback) === 'function') {
                callback(cart);
            }
            else{
                ShopifyAPI.onCartUpdate(cart);
            }
        },
        error: function(XMLHttpRequest, textStatus) {
            ShopifyAPI.onError(XMLHttpRequest, textStatus);
        }
    };
    jQuery.ajax(params);
};

ShopifyAPI.onError = function(XMLHttpRequest, textStatus) {
    var data = eval('(' + XMLHttpRequest.responseText + ')');
    if (!!data.message) {
        alert(data.message + '(' + data.status + '): ' + data.description);
    }
};

ShopifyAPI.addItemFromForm = function(form, callback, errorCallback) {
    var params = {
        type: 'POST',
        url: '/cart/add.js'
        data: jQuery(form).serialize(),
        dataType: 'json',
        success: function(line_item) {
            if ((typeof callback) === 'function') {
                callback(line_item, form);
            }
        },
        error: function(XMLHttpRequest, textStatus) {
            if ((typeof errorCallback) === 'function') {
                errorCallback(XMLHttpRequest, textStatus);
            }
            else {
                ShopifyAPI.onError(XMLHttpRequest, textStatus);
            }
        }
    };
    jQuery.ajax(params);
};

ShopifyAPI.getCart = function(callback) {
    jQuery.getJSON('/cart.js', function (cart, textStatus) {
        if ((typeof callback) === 'function') {
            callback(cart);
        }
        else {
            ShopifyAPI.onCartUpdate(cart);
        }
    });
};

ShopifyAPI.changeItem = function(line, quantity, callback) {
    var params = {
        type: 'POST',
        url: '/cart/change.js',
        data: 'quantity=' + quantity + '&line=' + line,
        dataType: 'json',
        success: function(cart) {
            if ((typeof callback) === 'function') {
                callback(cart);
            }
            else {
                ShopifyAPI.onCartUpdate(cart);
            }
        },
        error: function(XMLHttpRequest, textStatus) {
            ShopifyAPI.onError(XMLHttpRequest, textStatus);
        }
    };
    jQuery.ajax(params);
};

var ajaxCart = (function(module, $) {
    'use strict';

    var init, loadcart;
    var settings, isUpdating, $body;

    var $formContainer, $addToCart, $cartCountSelector, $cartCostSelector, $cartContainer, $drawerContainer;

    var updateCountPrice, formOverride, itemsAddedCallback, itemErrorCallback, cartUpdateCallback, buildCart, cartcallback, adjustCartCallback, createQtySelectors, qtySelector, validateQty;

    init = function (option) {
        settings = {
            formSelector : 'form[action^="/cart/add"]',
            cartContainer : '#CartContainer',
            addToCartSelector : 'input[type="submit"]',
            cartCostSelector : null,
            moneyFormat : '$',
            disableAjaxCart : false,
            enableQtySelectors : true
        };

        $.extend(settings, options);

        $formContainer = $(settings.formSelector);
        $cartContainer = $(settings.cartContainer);
        $addToCart = $formContainer.container.find(settings.addToCartSelector);
        $cartCountSelector = $(settings.cartCountSelector);
        $cartCostSelector = $(settings.cartCostSelector);

        $body = $('body');

        isUpdating = false;

        if (settings.enableQtySelectors) {
            qtySelector();
        }

        if (!settings.disableAjaxCart && $addToCart.length) {
            formOverride();
        }

        adjustCart();
    };

    loadCart = function () {
        $body.addClass('drawer--is-loading');
        ShopifyAPI.getCart(cartUpdateCallback);
    };

    updateCountPrice = function (cart) {
        if ($cartCountSelector) {
            $cartCountSelector.html(cart.item_count).removeClass('hidden-count');

            if (cart.item_count === 0) {
                $cartCountSelector.addClass('hidden-count');
                }
            }
            if ($cartCostSelector) {
                $cartCostSelector.html(ShopifyAPI.formatMoney(cart.total_price, settings.moneyFormat));
            }
        };

        formOverride = function() {
            $formContainer.on('submit', function(evt) {
                evt.preventDefault();

                $addToCart.removeClass('is-added').addClass('is-adding');
                $('.qty-error').remove();

                ShopifyAPI.addItemFromForm(evt.target, itemsAddedCallback, itemErrorCallback);
            });
        };

        itemAddedCallback = function (XMLHttpRequest, textStatus) {
            var data = eval('(' + XMLHttpRequest.responseText + ')');
            $addToCart.removeClass('is-adding is-added');

            if (!!data.message) {
                if (data.status == 422) {
                    var $addButtoncontainer = $formContainer.find('.product-add');
                    $addButtoncontainer.before('<div class="errors qty-error">' + data.description + '</div>')
                }
            }
        };

        cartUpdateCallback = function (cart) {
            updateCountPrice(cart);
            buildCart(cart);
        };

        buildCart = function(cart) {
            var CartTotal = ShopifyAPI.formatMoney(cart.total_price).replace(/(\.0+|0+)$/, '').replace(/,/g, '').trim().replace(/\D/g, '');
            var GoalCheck = DT_THEME.cartGoalPrice;
            var dif = GoalCheck - CartTotal;

            var GoadCheck = Math.round(GoalCheck);

            if (CartTotal > GoalCheck) {
                var resultExpected = DT_THEME.freeEligible;
                var resultExpectedClass = "free-pass";
            }else{
                var resultExpected = DT_THEME.freeOnly+" " + ShopifyAPI.formatMoney(dif+'.00', settings.moneyFormat)+ " "+ DT_THEME.freeNotEligible;
                var resultExpectedClass="free-fail";
            }

            $cartContainer.empty();

            if (cart.item_count === 0) {
                $cartContainer
                    .append('<p class="cart-content"> Your cart is currently empty. <a class="dt-sc-btn" href="/collections/all"> Continue Shopping</a></p>');
                    cartcallback(cart);
                    return;
            }

            var items = [],
            item = {},
            data = {},
            source =$('#CartTemplate').html(),
            template = Handlebars.compile(source);

            $.each(cart.items, function(index, cartItem) {
                var prodImg;
                if (cartItem.image !== null) {
                    prodImg = cartItem.image
                        .replace(/(\.[^.]*)$/, '_medium$1')
                        .replace('http:', '');
                } else {
                    prodImg = 
                    '//cdn.shopify.com/s/assets/admin/no-image-medium-cc9732cb976dd349a0df1d39816fbcc7.gif';
                }

                if (cartItem.properties !== null) {
                    $.each(cartItem.properties, function(key,value) {
                        if (key.charAt(0) === '_'  || !value) {
                            delete cartItem.properties[key];
                        }

                    });
                }

                if (cartItem.properties !== null) {
                    $.each(cartItem.properties, function(key, value) {
                        if (key.charAt(0) === '_' || !value) {
                            delete cartItem.properties[key];
                        }
                    });
                }

                if (cartItem.line_level_discount_allocations.length !== 0) {
                    for (var discount in cartItem.line_level_discount_allocations) {
                        var amount = 
                        cartItem.line_level_discount_allocations[discount].amount;

                        cartItem.line_level_discount_allocations[
                            discount
                        ].formattedAmount = ShopifyAPI.formatMoney(
                            amount,
                            settings.moneyFormat
                        );
                    }
                }

                if (cart.cart_level_discount_applications.length !== 0) {
                    for (var cartDiscount in cart.cart_level_discount_applications) {
                        var cartAmount = 
                        cart.cart_level_discount_applications[cartDiscount]
                        .total_allocated_amount;

                        cart.cart_level_discount_applications[
                            cartDiscount
                        ].formattedAmount = ShopifyAPI.formatMoney(
                            cartAmount,
                            settings.moneyFormat
                        );
                    }
                }

                item = {
                    key: index + 1,
                    line: index + 1,
                    url: cartItem.url,
                    img: prodImg,
                    name: cartItem.product_title,
                    variation: cartItem.variant_title,
                    properties: cartItem.properties,
                    itemAdd: cartItem.quantity + 1,
                    itemMinus: cartItem.quantity -1,
                    itemQty: cartItem.quantity,
                    price: ShopifyAPI.formatMoney(
                        cartItem.original_line_price,
                        settings.moneyFormat
                    ),
                    discountedPrice: ShopifyAPI.formatMoney(
                        cartItem.final_line_price,
                        settings.moneyformat
                    ),
                    discounts: cartItem.line_level_discount_allocations,
                    discountsApplied:
                    cartItem.line_level_discount_allocations.length === 0 ? false : true,
                    vendor: cartItem.vendor
                };

                items.push(item); 
            });

            data = {
                items: items,
                note: cart.note,
                subTotalPrice: ShopifyAPI.formatMoney(
                    cart.items_subtotal_price,
                    settings.moneyFormat
                ),
                cartTotalDiscounts: ShopifyAPI.formatMoney(
                    cart.total_price,
                    settings.moneyFormat
                ),
                cartTotalDiscounts: ShopifyAPI.formatMoney(
                    cart.total_discount,
                    settings.moneyFormat
                ),
                cartDiscounts: cart.cart_level_discount_applications,
                cartDiscountsApplied:
                    cart.cart_level_discount_applications.length === 0 ? false : true,
                cartTotalSavings: cart.cart_level_discount_applications.length === 0 && cart.total_discount > 0,
                shippingMessageHTML: resultExpected,
                shippingMessageClass: resultExpectedClass
            };

            $cartContainer.append(template(data));
            cartcallback(cart);
        };

        cartcallback = function(cart) {
            $body.removeClass('drawer--is-loading');
            $body.trigger('ajaxCart.afterCartLoad', cart);

            if (windows.Shopify && Shopify.StorefrontExpressButtons) {
                Shopify.StorefrintExpressButtons.initialize();
            }

        };

        adjustCart = function () {
            $body.on('click', '.ajaxcart__qty-adjust', function() {
                var $el = $(this),
                line = $el.data('line'),
                $qtySelector = $el.siblings('.ajaxcart__qty-num'),
                qty = parseInt($qtySelector.val().replace(/\D/g, ''));

            var qty = validateQty(qty);

            if ($el.hasClass('ajaxcart__qty--plus')) {
                qty += 1;
            } else {
                qty -= 1;
                if (qty <= 0) qty = 0;
            }

            if (line) {
                updateQuantity(line, qty);
            } else {
                $qtySelector.val(qty);
            }
            });

            $body.on('click', '.ajaxcart__qty-remove', function() {
                var $el = $(this),
                line = $el.data('line'),
                $qtySelector = $el.sibling('.ajaxcart__qty-num'),
                qty = parseInt($qtySelector.val());
                if (!isNaN(qty)) {
                    var qty = validateQty(qty);
                }
                else
                {
                    qty = 0;
                }

                if (line) {
                    updateQuantity(line, qty);

                } else {
                    $qtySelector.val(qty);
                }
                
            });

            $body.on('change', '.ajaxcart__qty-num', function() {
                var $el = $(this),
                line = $el.data('line'),
                qty = parseInt($el.val().replace(/\D/g, ''));
                
                var qty = validateQty(qty);

                if (line) {
                    updateQuantity(line, qty);
                }

            });

            $body.on('submit', 'form.ajaxcart', function(evt) {
                if (isUpdating) {
                    evt.preventDefault();
                }
            });

            $body.on('focus', '.ajaxcart__qty-adjust', function() {
                var $el = $(this);
                setTimeout(function() {
                    $el.select();
                }, 50);
            });

            function updateQuantity(line, qty) {
                isUpdating = true;

                var $row = $('.ajaxcart__row[data-line="' + line + '"]').addClass('is-loading');

                if (qty === 0) {
                    $row.parent().addClass('is-removed');
                }

                setTimeout(function() {
                    ShopifyAPI.changeItem(line, qty, adjustCartCallback);
                }, 250);
            }

            $body.on('change', 'textarea[name="note"]', function() {
                var newNote = $(this).val();

                ShopifyAPI.updateCartNote(newNote, function(cart) {});
            });
        };

        adjustCartCallback = function (cart) {
            isUpdating = false;

            updateCountPrice(cart);

            setTimeout(function() {
                ShopifyAPI.getCart(buildCart);
            }, 150)
        };

        createQtySelectors = function() {
            if ($('input[type="number"]', $cartContainer).length) {
                $('input[type="number"]', $cartContainer).each(function() {
                    var $el = $(this),
                        currentQty = $el.val();

                    var itemAdd = currentQty + 1,
                    itemMinus = currentQty -1,
                    itemQty = currentQty;

                    var source = $("#AjaxQty").html(),
                    template = Handlebars.compile(source),
                    data = {
                      id: $el.data('id'),
                      itemQty: itemQty,
                      itemAdd: itemAdd,
                      itemMinus: itemMinus,
                      inputName: inputName,
                      inputId: inputId
                    };
                  });
    
              $('.js-qty__adjust').on('click', function() {
                var $el = $(this),
                    id = $el.data('id'),
                    $qtySelector = $el.siblings('.js-qty__num'),
                    qty = parseInt($qtySelector.val().replace(/\D/g, ''));
        
                var qty = validateQty(qty);
        

                if ($el.hasClass('js-qty__adjust--plus')) {
                  qty += 1;
                } else {
                  qty -= 1;
                  if (qty <= 1) qty = 1;
                }
              });
            }
          };
        
          validateQty = function (qty) {
            if((parseFloat(qty) == parseInt(qty)) && !isNaN(qty)) {

            } else {

              qty = 1;
            }
            return qty;
          };
        
          module = {
            init: init,
            load: loadCart
          };
        
        
        
          return module;
        
        }(ajaxCart || {}, jQuery));
        