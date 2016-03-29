define(['jquery', 'underscore', 'app', 'hall-map/seat-base', 'hall-map/tip', 'popup', 'hogan', 'utils', 'jquery.cookie', 'domReady!'], function($, _, App, HallMapSeatBase, jsHallMapTip, Popup, Hogan, Utils) {
    'use strict';
    var Js_HallMap_TicketOffice = function() {
        Js_HallMap_TicketOffice.parent.constructor.call(this);
        this._zone2SeatMap = null;
        this.isTouchMoved = false;
    };
    Js_HallMap_TicketOffice.prototype.ns = 'jsHallMapTicketOffice';
    Utils.extendClass(Js_HallMap_TicketOffice, HallMapSeatBase);
    Js_HallMap_TicketOffice.prototype._afterHallMapSvgHasBeenAssembled = function() {
        Js_HallMap_TicketOffice.parent._afterHallMapSvgHasBeenAssembled.call(this);
        this._requestInProgress = 0;
        this._disableTicketRequests = false;
        this.getConfig().tipTemplate = Hogan.compile(this.getConfig().tipTemplate);
        _.each(this._zoneDataMap, function(zoneData, zone) {
            if (this.getConfig().zoneConfigMap.hasOwnProperty(zone)) {
                d3.select(zoneData.primitiveNode).classed('available', this.getConfig().zoneConfigMap[zone].isAvailable);
            }
        }, this);
        $(document).on('touchmove', $.proxy(function() {
            this.isTouchMoved = true;
        }, this)).on('touchstart', $.proxy(function() {
            this.isTouchMoved = false;
        }, this));
        this._tip = new jsHallMapTip(this);
        this.positionateToBorderOrigin(this._hallBorderOrigin, 0);
        require(['text!' + this.getConfig().zone2SeatMapUrl], _.bind(function(zone2SeatMap) {
            var $promoCodeInput;
            this._zone2SeatMap = JSON.parse(zone2SeatMap);
            this._$panel = this._$element.find('.jsHallMapTicketOffice-panel');
            this._$panelMobile = this._$element.find('.jsHallMapTicketOffice-panelMobile');
            this._$element.on('click', '.jsHallMapTicketOffice-selectedTicket-delete', _.bind(this._onTicketDeleteClick, this));
            this._$element.on('click', '.jsHallMapTicketOffice-checkout', _.bind(this._onCheckoutBtnClick, this));
            this._$element.on('click', '.jsHallMapTicketOffice-cancel', _.bind(this._onCancelBtnClick, this));
            this.orderConfig = window.jsHallMapTicketOfficeOrderConfig;
            this._$element.on('countDown:ended', null, _.bind(this._onTimeout, this));
            this._$element.on('submit', '[data-ticket-office-promo-code]', $.proxy(this._onPromoCodeSubmit, this));
            $promoCodeInput = this._$element.find('[data-ticket-office-promo-code-input]');
            if ($promoCodeInput.length && $promoCodeInput.val().length) {
                this._$element.find('[data-ticket-office-promo-code-element]').addClass('valid').removeClass('invalid');
            }
            this.orderConfig = this.getConfig().orderConfig;
            this._initOrderConfig();
            this._updateSeatConfigList(this.getConfig().seatConfigList);
            this._updateGapNotification(this.getConfig().gapNotification);
            this._processSeatsVisibility();
            $(window).resize(_.bind(function() {
                this._updateInfoBlockSize();
            }, this));
            if (this.getConfig().initialZoneName && this._zoneDataMap.hasOwnProperty(this.getConfig().initialZoneName)) {
                this.positionateToBorderOrigin(this._zoneDataMap[this.getConfig().initialZoneName].borderOrigin, window.TRANSFORM_DURATION);
            }
            $('body').trigger('content-changed');
        }, this));
    };
    Js_HallMap_TicketOffice.prototype._shouldHideSeats = null;
    Js_HallMap_TicketOffice.prototype._updateInfoBlockSize = function() {
        this._$panel.find('.jsHallMapTicketOffice-selectedTicketList').css({
            'max-height': this._viewportHeight * 0.3333 + 'px'
        });
        this._$panelMobile.find('.jsHallMapTicketOffice-selectedTicketList').css({
            'max-height': (this._viewportHeight - 40 - 50 - 20) + 'px'
        });
    };
    Js_HallMap_TicketOffice.prototype._updateZoneConfigMap = function(zoneConfigMap) {
        var that;
        that = this;
        _.each(zoneConfigMap, function(zoneConfig, zone) {
            that.getConfig().zoneConfigMap[zone] = zoneConfig;
            if (that._zoneDataMap.hasOwnProperty(zone)) {
                d3.select(that._zoneDataMap[zone].primitiveNode).classed('available', zoneConfig.isAvailable).classed('seatsAreLoaded', false);
                d3.selectAll('[z="' + zone + '"] .s').remove();
            }
        });
        this._processSeatsVisibility();
    };
    Js_HallMap_TicketOffice.prototype._updateGapNotification = function(gapNotification) {
        var $gapNotification;
        $gapNotification = $('#gapNotification');
        if (gapNotification) {
            $gapNotification.html(gapNotification).show();
        } else {
            $gapNotification.html('').hide();
        }
    };
    Js_HallMap_TicketOffice.prototype._updateSeatConfigList = function(seatConfigList) {
        _.each(seatConfigList, function(seatConfig) {
            var zoneConfig, primitive;
            zoneConfig = this.getConfig().zoneConfigMap[seatConfig.z];
            if (!zoneConfig) {
                return;
            }
            if (!this.getConfig().zoneConfigMap[seatConfig.z].hasOwnProperty('rowDataMap')) {
                this.getConfig().zoneConfigMap[seatConfig.z].rowDataMap = {};
            }
            if (!this.getConfig().zoneConfigMap[seatConfig.z].rowDataMap.hasOwnProperty(seatConfig.r)) {
                this.getConfig().zoneConfigMap[seatConfig.z].rowDataMap[seatConfig.r] = {};
            }
            if (!this.getConfig().zoneConfigMap[seatConfig.z].rowDataMap[seatConfig.r].hasOwnProperty(seatConfig.p)) {
                this.getConfig().zoneConfigMap[seatConfig.z].rowDataMap[seatConfig.r][seatConfig.p] = {
                    v: null,
                    s: null
                };
            }
            if (zoneConfig.seatMarkingMode == 'a') {
                this.getConfig().zoneConfigMap[seatConfig.z].rowDataMap[seatConfig.r][seatConfig.p].v = zoneConfig.isAvailable && seatConfig.a;
            } else {
                this.getConfig().zoneConfigMap[seatConfig.z].rowDataMap[seatConfig.r][seatConfig.p].v = !zoneConfig.isAvailable || !seatConfig.a;
            }
            this.getConfig().zoneConfigMap[seatConfig.z].rowDataMap[seatConfig.r][seatConfig.p].s = zoneConfig.isAvailable && seatConfig.s;
            primitive = d3.select('[z="' + seatConfig.z + '"] [r="' + seatConfig.r + '"][p="' + seatConfig.p + '"]');
            if (primitive.node()) {
                this._initSeat(primitive.node(), primitive, seatConfig.z, seatConfig.r, seatConfig.p);
            }
        }, this);
    };
    Js_HallMap_TicketOffice.prototype._initSeat = function(primitiveNode, primitive, zone, row, place) {
        var tipHtml, isAvailable, that;
        tipHtml = this.getConfig().tipTemplate.render({
            row: row,
            place: place,
            price: this.getConfig().zoneConfigMap[zone].price
        });
        isAvailable = this._processSeatState(primitiveNode, primitive, zone, row, place);
        that = this;
        if (!primitiveNode.isMouseoverSubscribed) {
            primitiveNode.isMouseoverSubscribed = true;
            primitive.on('mouseover', function(datum) {
                that._activateSeat(primitive, tipHtml);
            });
        }
        if (!primitiveNode.isMouseoutSubscribed) {
            primitiveNode.isMouseoutSubscribed = true;
            primitive.on('mouseout', function(datum) {
                that._tip.hide();
            });
        }
        if (isAvailable && !primitiveNode.isClickSubscribed) {
            primitiveNode.isClickSubscribed = true;
            if (navigator.userAgent.match(/ipad|iphone|ios/i)) {
                primitive.on('touchend', function(datum) {
                    if (d3.event.defaultPrevented) {
                        return;
                    }
                    if (!that.isTouchMoved) {
                        that._selectSeat(primitive, zone);
                    }
                });
            }
            primitive.on('click', function(datum) {
                if (d3.event.defaultPrevented) {
                    return;
                }
                that._selectSeat(primitive, zone);
            });
        }
    };
    Js_HallMap_TicketOffice.prototype._selectSeat = function(primitive, zone) {
        var idEventMapZone, that;
        if (!primitive.classed('available') || primitive.classed('inProgress') || this._disableTicketRequests) {
            return;
        }
        idEventMapZone = this.getConfig().zoneConfigMap[zone].idEventMapZone;
        that = this;
        this._checkResetSelection(idEventMapZone, function() {
            primitive.classed('inProgress', true);
            if (that._requestInProgress == 0) {
                that.disable();
            }
            that._requestInProgress++;
            $.ajax({
                type: 'POST',
                url: primitive.classed('selected') ? that.getConfig().deselectSeatUrl : that.getConfig().selectSeatUrl,
                data: {
                    id_event_map_zone: idEventMapZone,
                    row: primitive.attr('r'),
                    place: primitive.attr('p')
                },
                complete: function() {
                    primitive.classed('inProgress', false);
                },
                dataType: 'json'
            }).always(_.bind(that.refresh, that));
        });
    };
    Js_HallMap_TicketOffice.prototype._activateSeat = function(primitive, tipHtml) {
        if (tipHtml && !this._tip.isVisible()) {
            primitive.classed('hover', true);
            this._tip.show(tipHtml, primitive.node());
        }
    };
    Js_HallMap_TicketOffice.prototype._deactivateAllSeats = function() {
        d3.select('.s.hover').classed('hover', false);
        this._tip.hide();
    };
    Js_HallMap_TicketOffice.prototype._processSeatState = function(primitiveNode, primitive, zone, row, place) {
        var zoneConfig, isInList = false,
            isBlocked = false,
            isSelected = false,
            isAvailable;
        zoneConfig = this.getConfig().zoneConfigMap[zone];
        if (!zoneConfig) {
            return;
        }
        if (zoneConfig.hasOwnProperty('rowDataMap') && zoneConfig.rowDataMap.hasOwnProperty(row) && zoneConfig.rowDataMap[row].hasOwnProperty(place)) {
            isInList = zoneConfig.rowDataMap[row][place].v == 1;
            isBlocked = zoneConfig.rowDataMap[row][place].b == 1;
            isSelected = zoneConfig.rowDataMap[row][place].s == 1;
        }
        if (zoneConfig.seatMarkingMode == 'a') {
            isAvailable = isInList;
        } else {
            isAvailable = !isInList;
        }
        if (isBlocked) {
            isAvailable = true;
        }
        primitive.classed('blocked', isBlocked);
        primitive.classed('available', isAvailable);
        primitive.classed('selected', isSelected);
        return isAvailable;
    };
    Js_HallMap_TicketOffice.prototype._initGeneralAdmissionSection = function(primitiveNode) {
        var primitive, that;
        primitive = d3.select(primitiveNode);
        that = this;
        primitive.on('click', function(datum) {
            var zonePrimitiveNode, zonePrimitive;
            if (d3.event.defaultPrevented) {
                return;
            }
            zonePrimitiveNode = d3.event.target;
            zonePrimitive = d3.select(zonePrimitiveNode.parentNode.parentNode);
            if (zonePrimitive.classed('available') && !zonePrimitive.classed('inProgress') && !that._disableTicketRequests) {
                var zone, idEventMapZone;
                zone = zonePrimitive.attr('z');
                idEventMapZone = that.getConfig().zoneConfigMap[zone].idEventMapZone;
                that._checkResetSelection(idEventMapZone, function() {
                    if (that._requestInProgress == 0) {
                        that.disable();
                    }
                    that._requestInProgress++;
                    zonePrimitive.classed('inProgress', true);
                    that._appearPlusOneOverZone(zonePrimitiveNode);
                    $.ajax({
                        type: 'POST',
                        url: that.getConfig().selectTicketUrl,
                        data: {
                            id_event_map_zone: idEventMapZone
                        },
                        complete: function() {
                            zonePrimitive.classed('inProgress', false);
                            $($.data(primitiveNode, 'plusOneNode')).stop(true, true).fadeOut(500);
                        },
                        dataType: 'json'
                    }).always(_.bind(that.refresh, that));
                });
            }
        });
    };
    Js_HallMap_TicketOffice.prototype._onTimeout = function() {
        if (this.orderConfig.timeLeft !== null) {
            var expiredIdListStringFromCookie = $.cookie('id_expired_order_list'),
                expiredIdListFromCookie;
            if (expiredIdListStringFromCookie) {
                expiredIdListFromCookie = expiredIdListStringFromCookie.split(',');
            } else {
                expiredIdListFromCookie = [];
            }
            if ($.inArray(this.orderConfig.idOrder, expiredIdListFromCookie) === -1) {
                expiredIdListFromCookie.push(this.orderConfig.idOrder);
                $.cookie('id_expired_order_list', expiredIdListFromCookie.join(','), {
                    path: '/'
                });
            }
            Popup.show($('#popupTimeout').html());
            $(document).on('hidden.bs.modal', function() {
                document.location.reload();
            });
        }
    };
    Js_HallMap_TicketOffice.prototype._appearPlusOneOverZone = function(primitiveNode) {
        var bbox, borderScreen, plusOneNode, $plusOneNode, top, left, width, height, x1, y1, x2, y2, xMax, yMax;
        plusOneNode = $.data(primitiveNode, 'plusOneNode');
        if (plusOneNode) {
            $(plusOneNode).remove();
        }
        $plusOneNode = $('<div class="jsHallMap-plusOne" style="display: none;">+1</div>');
        this._$element.prepend($plusOneNode);
        $.data(primitiveNode, 'plusOneNode', $plusOneNode[0]);
        bbox = $.data(primitiveNode, 'bbox');
        borderScreen = this.applyMatrixToBBox(bbox, this.makeContainerMatrix());
        x1 = borderScreen.x1;
        y1 = borderScreen.y1;
        x2 = borderScreen.x2;
        y2 = borderScreen.y2;
        xMax = this._viewportWidth;
        yMax = this._viewportHeight;
        left = x1;
        top = y1;
        width = x2 - x1;
        height = y2 - y1;
        if (x1 < 0 && y1 < 0 && x2 < xMax && y2 < yMax) {
            left = 0;
            top = 0;
            width = x2;
            height = y2;
        }
        if (x1 > 0 && y1 < 0 && x2 < xMax && y2 < yMax) {
            left = x1;
            top = 0;
            width = x2 - x1;
            height = y2;
        }
        if (x1 > 0 && y1 < 0 && x2 > xMax && y2 < yMax) {
            left = x1;
            top = 0;
            width = xMax - x1;
            height = y2;
        }
        if (x1 > 0 && y1 > 0 && x2 > xMax && y2 < yMax) {
            left = x1;
            top = y1;
            width = xMax - x1;
            height = y2 - y1;
        }
        if (x1 > 0 && y1 > 0 && x2 > xMax && y2 > yMax) {
            left = x1;
            top = y1;
            width = xMax - x1;
            height = yMax - y1;
        }
        if (x1 > 0 && y1 > 0 && x2 < xMax && y2 > yMax) {
            left = x1;
            top = y1;
            width = x2 - x1;
            height = yMax - y1;
        }
        if (x1 < 0 && y1 > 0 && x2 < xMax && y2 > yMax) {
            left = 0;
            top = y1;
            width = x2;
            height = yMax - y1;
        }
        if (x1 < 0 && y1 > 0 && x2 < xMax && y2 < yMax) {
            left = 0;
            top = y1;
            width = x2;
            height = y2 - y1;
        }
        if (x1 < 0 && y1 < 0 && x2 < xMax && y2 > yMax) {
            left = 0;
            top = 0;
            width = x2;
            height = yMax;
        }
        if (x1 < 0 && y1 < 0 && x2 > xMax && y2 < yMax) {
            left = 0;
            top = 0;
            width = xMax;
            height = y2;
        }
        if (x1 > 0 && y1 < 0 && x2 > xMax && y2 > yMax) {
            left = x1;
            top = 0;
            width = xMax - x1;
            height = y2;
        }
        if (x1 < 0 && y1 > 0 && x2 > xMax && y2 > yMax) {
            left = 0;
            top = y1;
            width = xMax;
            height = yMax - y1;
        }
        if (x1 < 0 && y1 > 0 && x2 > xMax && y2 > yMax) {
            left = 0;
            top = y1;
            width = xMax;
            height = yMax - y1;
        }
        if (x1 < 0 && y1 < 0 && x2 > xMax && y2 > yMax) {
            left = 0;
            top = 0;
            width = xMax;
            height = yMax;
        }
        $plusOneNode.css({
            top: top + 'px',
            left: left + 'px',
            width: width + 'px',
            height: height + 'px',
            'line-height': height + 'px',
            'font-size': Math.min(0.7 * height, 0.7 * width, 0.7 * this._viewportWidth, 0.7 * this._viewportHeight) + 'px'
        });
        $plusOneNode.stop(true, true).fadeIn(500);
    };
    Js_HallMap_TicketOffice.prototype._onTicketDeleteClick = function(event) {
        var $ticketElement;
        event.preventDefault();
        $ticketElement = $(event.target).parents('.jsHallMapTicketOffice-selectedTicket');
        if (this._requestInProgress > 0 || this._disableTicketRequests) {
            return;
        }
        this._requestInProgress++;
        this.disable();
        $.ajax({
            type: 'POST',
            url: this.getConfig().deleteTicketUrl,
            data: {
                id_event_ticket: $ticketElement.data('ticket').idEventTicket
            },
            dataType: 'json'
        }).always(_.bind(this.refresh, this));
    };
    Js_HallMap_TicketOffice.prototype._onTicketTypeChange = function(event) {
        var $typeSelect, idTicket;
        $typeSelect = $(event.currentTarget);
        idTicket = $typeSelect.parents('.jsHallMapTicketOffice-selectedTicket').data('ticket').idEventTicket;
        if (this._requestInProgress > 0 || this._disableTicketRequests) {
            return;
        }
        this._requestInProgress++;
        this.disable();
        $.ajax({
            type: 'POST',
            url: this.getConfig().changeTicketTypeUrl,
            data: {
                id_event_ticket: idTicket,
                id_event_ticket_type: $typeSelect.val()
            },
            dataType: 'json'
        }).always(_.bind(this.refresh, this));
    };
    Js_HallMap_TicketOffice.prototype._onCheckoutBtnClick = function() {
        var that;
        if (this._requestInProgress > 0) {
            return;
        }
        that = this;
        this._requestInProgress++;
        this._disableTicketRequests = true;
        this.disable();
        $.ajax({
            type: 'POST',
            url: this.getConfig().checkoutUrl,
            data: {
                id_event_show: this.getConfig().idEventShow
            },
            complete: function() {
                that._disableTicketRequests = false;
            },
            dataType: 'json'
        }).always(_.bind(this.refresh, this));
    };
    Js_HallMap_TicketOffice.prototype._onCancelBtnClick = function() {
        var that;
        if (this._requestInProgress > 0) {
            return;
        }
        that = this;
        this._checkResetSelection(-1, function() {
            that._requestInProgress++;
            that._disableTicketRequests = true;
            that.disable();
            $.ajax({
                type: 'POST',
                url: that.getConfig().cancelUrl,
                data: {
                    id_event_show: that.getConfig().idEventShow
                },
                complete: function() {
                    that._disableTicketRequests = false;
                },
                dataType: 'json'
            }).always(_.bind(that.refresh, that));
        });
    };
    Js_HallMap_TicketOffice.prototype._onPromoCodeSubmit = function(event) {
        var that;
        event.preventDefault();
        that = this;
        if (this._requestInProgress > 0) {
            return;
        }
        this._requestInProgress++;
        this._disableTicketRequests = true;
        this.disable();
        $.ajax({
            type: 'POST',
            url: this.getConfig().promoCodeApplyUrl,
            data: {
                promo_code: this._$element.find('[data-ticket-office-promo-code-input]').val()
            },
            complete: function() {
                that._disableTicketRequests = false;
            },
            dataType: 'json'
        }).always(_.bind(this.refresh, this));
    };
    Js_HallMap_TicketOffice.prototype._checkResetSelection = function(idEventMapZone, continueCallback) {
        var showResetPopup = false;
        $.each(this.orderConfig.ticketList, function(i, orderTicket) {
            if (orderTicket.isPackage) {
                showResetPopup = true;
                return false;
            }
            if (orderTicket.idEventMapZone !== idEventMapZone) {
                showResetPopup = true;
                return false;
            }
            return true;
        });
        if (showResetPopup) {
            if (this._requestInProgress > 0) {
                return;
            }
            Popup.promptConfirm({
                text: 'Your selection will be reset.<br/>Are you sure?',
                yesText: 'Continue',
                noText: 'Keep my selection',
                yesCallback: continueCallback
            });
        } else {
            continueCallback();
        }
    };
    Js_HallMap_TicketOffice.prototype._hideSeats = function() {
        Js_HallMap_TicketOffice.parent._hideSeats.call(this);
        if (this._tip) {
            this._tip.hide();
        }
    };
    Js_HallMap_TicketOffice.prototype._onPositionateToSeat = function(event, zone, row, place) {
        var $seat, borderOrigin;
        $seat = $('[z="' + zone + '"] [r="' + row + '"][p="' + place + '"]');
        if (!$seat.length) {
            this._loadSeatsForZone(zone);
            $seat = $('[z="' + zone + '"] [r="' + row + '"][p="' + place + '"]');
        }
        borderOrigin = $.data($seat[0], 'borderOrigin');
        if (!borderOrigin) {
            borderOrigin = this.applyMatrixToBBox($seat[0].getBBox(), this.makePrimitiveMatrix($seat[0]));
            $.data($seat[0], 'borderOrigin', borderOrigin);
        }
        this.positionateToBorderOrigin(borderOrigin, window.TRANSFORM_DURATION);
    };
    Js_HallMap_TicketOffice.prototype._initOrderConfig = function() {
        var $ticketList, $ticketListMobile;
        $ticketList = this._$panel.find('.jsHallMapTicketOffice-selectedTicketList');
        $ticketListMobile = this._$panelMobile.find('.jsHallMapTicketOffice-selectedTicketList');
        $ticketList.empty();
        $ticketListMobile.empty();
        if (this.orderConfig.ticketList.length) {
            var $ticket, $ticketMobile, $renderedTickets = $([]),
                $renderedTicketsMobile = $([]),
                selectedTicketTemplate = Hogan.compile(this.orderConfig.selectedTicketTemplate);
            _.each(this.orderConfig.ticketList, function(orderTicket) {
                $ticket = $(selectedTicketTemplate.render(orderTicket));
                $ticket.data('ticket', orderTicket);
                $ticket.find('.jsHallMapTicketOffice-selectedTicket-ticketTypeSelect').removeAttr('id').removeAttr('name').val(orderTicket.idEventTicketType).change(_.bind(this._onTicketTypeChange, this));
                $renderedTickets = $renderedTickets.add($ticket);
                $ticketMobile = $ticket.clone(true);
                $ticketMobile.find('.jsHallMapTicketOffice-selectedTicket-ticketTypeSelect').val(orderTicket.idEventTicketType);
                $renderedTicketsMobile = $renderedTicketsMobile.add($ticketMobile);
            }, this);
            $ticketList.append($renderedTickets);
            $ticketListMobile.append($renderedTicketsMobile);
            this._$panel.find('.jsHallMapTicketOffice-noTickets').hide();
            this._$panel.find('.jsHallMapTicketOffice-selectedTicketListWrapper').show();
            this._$panelMobile.find('.jsHallMapTicketOffice-noTickets').hide();
            this._$panelMobile.find('.jsHallMapTicketOffice-selectedTicketListWrapper').show();
        } else {
            this._$panel.find('.jsHallMapTicketOffice-selectedTicketListWrapper').hide();
            this._$panel.find('.jsHallMapTicketOffice-noTickets').show();
            this._$panelMobile.find('.jsHallMapTicketOffice-selectedTicketListWrapper').hide();
            this._$panelMobile.find('.jsHallMapTicketOffice-noTickets').show();
        }
        this._updateInfoBlockSize();
        this._$element.find('.jsHallMapTicketOffice-quantity').html(this.orderConfig.ticketList.length);
        this._$element.find('.jsHallMapTicketOffice-total').html(Utils.formatNumber(this.orderConfig.amount, 2, '.', ','));
        if ('commissionFee' in this.orderConfig && this.orderConfig.commissionFee > 0) {
            this._$element.find('.jsHallMapTicketOffice-commission-fee').html(Utils.formatNumber(this.orderConfig.commissionFee, 2, '.', ',')).parents('.jsHallMapTicketOffice-fee').show();
        } else {
            this._$element.find('.jsHallMapTicketOffice-commission-fee').html(0).parents('.jsHallMapTicketOffice-fee').hide();
        }
        if ('ticketFee' in this.orderConfig && this.orderConfig.ticketFee > 0) {
            this._$element.find('.jsHallMapTicketOffice-ticket-fee').html(Utils.formatNumber(this.orderConfig.ticketFee, 2, '.', ',')).parents('.jsHallMapTicketOffice-fee').show();
        } else {
            this._$element.find('.jsHallMapTicketOffice-ticket-fee').html(0).parents('.jsHallMapTicketOffice-fee').hide();
        }
        if ('serviceFee' in this.orderConfig && this.orderConfig.serviceFee > 0) {
            this._$element.find('.jsHallMapTicketOffice-service-fee').html(Utils.formatNumber(this.orderConfig.serviceFee, 2, '.', ',')).parents('.jsHallMapTicketOffice-fee').show();
        } else {
            this._$element.find('.jsHallMapTicketOffice-service-fee').html(0).parents('.jsHallMapTicketOffice-fee').hide();
        }
        if (this.orderConfig.timeLeft !== null) {
            this._$element.find('.jsHallMapTicketOffice-count-down').data('count-down', this.orderConfig.timeLeft).show();
        } else {
            this._$element.find('.jsHallMapTicketOffice-count-down').data('count-down', 0).hide();
        }
        if (this._requestInProgress == 0) {
            this.enable();
        } else {
            this.disable();
        }
    };
    Js_HallMap_TicketOffice.prototype.disable = function() {
        $('.jsHallMapTicketOffice-selectedTicket-ticketTypeSelect').prop('disabled', true).parent().addClass('disabled').removeClass('enabled');
        $('.jsHallMapTicketOffice-checkout,[data-ticket-office-promo-code-btn],[data-ticket-office-promo-code-input]').prop('disabled', true);
        $('.jsHallMapTicketOffice-selectedTicket-delete').addClass('disabled');
    };
    Js_HallMap_TicketOffice.prototype.enable = function() {
        $('.jsHallMapTicketOffice-selectedTicket-ticketTypeSelect').prop('disabled', false).parent().addClass('enabled').removeClass('disabled');
        $('[data-ticket-office-promo-code-btn],[data-ticket-office-promo-code-input]').prop('disabled', false);
        $('.jsHallMapTicketOffice-selectedTicket-delete').removeClass('disabled');
        if (this.orderConfig.ticketList.length > 0) {
            $('.jsHallMapTicketOffice-checkout').addClass('button-green').prop('disabled', false);
        } else {
            $('.jsHallMapTicketOffice-checkout').removeClass('button-green').prop('disabled', true);
        }
    };
    Js_HallMap_TicketOffice.prototype.refresh = function(response) {
        var $promoCodeActivatedPopup, successPopupAdditionalTextTemplate;
        if (response.hasOwnProperty('zoneConfigMap')) {
            this._updateZoneConfigMap(response.zoneConfigMap);
        }
        if (response.hasOwnProperty('gapNotification')) {
            this._updateGapNotification(response.gapNotification);
        }
        if (response.hasOwnProperty('seatConfigList')) {
            this._updateSeatConfigList(response.seatConfigList);
        }
        if (response.hasOwnProperty('isPromoCodeValid')) {
            this._$element.find('[data-ticket-office-promo-code-element]').removeClass('valid invalid');
            if (response.isPromoCodeValid) {
                $promoCodeActivatedPopup = $('#popupPromoCodeActivated').clone();
                if (response.numTicketsUpdated && response.numTicketsTotal) {
                    if (response.numTicketsUpdated == response.numTicketsTotal) {
                        successPopupAdditionalTextTemplate = '<br/>All of your tickets were replaced with discounted ones.';
                    } else {
                        successPopupAdditionalTextTemplate = '<br />{{numTicketsUpdated}} ticket{{wordEnding}} {{wereWasPart}} automatically replaced with discounted one{{wordEnding}}.<br/>If some tickets were removed, this means<br/>there are no more discounted tickets available';
                    }
                    $promoCodeActivatedPopup.find('[data-info-popup-text-container]').append(Hogan.compile(successPopupAdditionalTextTemplate).render({
                        numTicketsUpdated: response.numTicketsUpdated,
                        wordEnding: (response.numTicketsUpdated > 1 ? 's' : ''),
                        wereWasPart: (response.numTicketsUpdated > 1 ? 'were' : 'was')
                    }));
                }
                Popup.show($promoCodeActivatedPopup.html());
                this._$element.find('[data-ticket-office-promo-code-element]').addClass('valid');
            } else if (this._$element.find('[data-ticket-office-promo-code-input]').val()) {
                this._$element.find('[data-ticket-office-promo-code-element]').addClass('invalid');
            }
        }
        if (response.hasOwnProperty('orderConfig')) {
            this.orderConfig = response.orderConfig;
        }
        this._requestInProgress--;
        this._initOrderConfig();
    };
    if ($('#jsHallMap-loader').length) {
        var loader = App.getLoader('jsHallMap-loader', 50);
    }
    loader.show();
    new Js_HallMap_TicketOffice();
});