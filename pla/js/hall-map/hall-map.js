define(['jquery', 'underscore', 'd3', 'stage', 'sylvester'], function($, _, d3, jsHallMapStage) {
    

    window.d3 = d3;
    window.TRANSFORM_DURATION = 300;
    window.ZOOM_PADDING_MODIFICATOR = 0.95;
    window.SECTION_SIZE_SEAT_VISBILITY_FACTOR = 0.6;
$( document ).ready(function() {
    Js_HallMap();
});
    var Js_HallMap = function() {
    	
        this._isTransformInProcess = false;
        this._minScale = null;
        this._maxScale = null;
        this._seatVisibilityScale = null;
        this._areSeatsPermanentlyVisible = null;
        this._areSeatsHere = false;
        this._viewportWidth = null;
        this._viewportHeight = null;
        this._mapWidth = null;
        this._mapHeight = null;
        this._svg = null;
        this._container = null;
        this._zoom = null;
        this._zoomSelection = null;
        this._currentKey = null;
        this._staticSeatPrimitiveList = [];
        this._zoneDataMap = {};
        this._$element = $('#jsHallMap');
         this._zone2SeatMap = null;
        this.isTouchMoved = false;
        if (!this._$element.length) {
            throw this.ns + ': main element was not found';
        }
        this.$_loader = $('.jsHallMap-loader');

        Js_HallMap.prototype._initViewport();
        Js_HallMap.prototype._assembleMap();
    };
    Js_HallMap.prototype.ns = 'jsHallMap';
    Js_HallMap.prototype._afterHallMapSvgHasBeenAssembled = function() {

        _$element.on('Js_HallMap:applySuperPosition', null, _.bind(this._onApplySuperPosition, this));
        _$element.on('Js_HallMap:positionateToZone', null, _.bind(this._onPositionateToZone, this));
        _$element.on('Js_HallMap:positionateToSeat', null, _.bind(this._onPositionateToSeat, this));
        _$element.on('click', '.jsHallMap-zoom-plus', _.bind(this._onZoomPlusClick, this));
        _$element.on('click', '.jsHallMap-zoom-minus', _.bind(this._onZoomMinusClick, this));
        d3.select('body').on('keypress', _.bind(this._onBodyKeypress, this));
        d3.select('body').on('keyup', _.bind(this._onBodyKeyup, this));
        this._requestInProgress = 0;
        this._disableTicketRequests = false;
        //this.getConfig().tipTemplate = Hogan.compile(this.getConfig().tipTemplate);
        _.each(_zoneDataMap, function(zoneData, zone) {
            if (this.getConfig().zoneConfigMap.hasOwnProperty(zone)) {
                d3.select(zoneData.primitiveNode).classed('available', this.getConfig().zoneConfigMap[zone].isAvailable);
            }
        }, this);
        $(document).on('touchmove', $.proxy(function() {
            this.isTouchMoved = true;
        }, this)).on('touchstart', $.proxy(function() {
            this.isTouchMoved = false;
        }, this));
        //this._tip = new jsHallMapTip(this);
        this.positionateToBorderOrigin(this._hallBorderOrigin, 0);
        require(['text!' + this.getConfig().zone2SeatMapUrl], _.bind(function(zone2SeatMap) {
            var $promoCodeInput;
            this._zone2SeatMap = JSON.parse(zone2SeatMap);
            //this._$panel = this._$element.find('.jsHallMapTicketOffice-panel');
            //this._$panelMobile = this._$element.find('.jsHallMapTicketOffice-panelMobile');
            //this._$element.on('click', '.jsHallMapTicketOffice-selectedTicket-delete', _.bind(this._onTicketDeleteClick, this));
            //this._$element.on('click', '.jsHallMapTicketOffice-checkout', _.bind(this._onCheckoutBtnClick, this));
            //this._$element.on('click', '.jsHallMapTicketOffice-cancel', _.bind(this._onCancelBtnClick, this));
            //this.orderConfig = window.jsHallMapTicketOfficeOrderConfig;
            //this._$element.on('countDown:ended', null, _.bind(this._onTimeout, this));
            //this._$element.on('submit', '[data-ticket-office-promo-code]', $.proxy(this._onPromoCodeSubmit, this));
            //$promoCodeInput = this._$element.find('[data-ticket-office-promo-code-input]');
            //if ($promoCodeInput.length && $promoCodeInput.val().length) {
              //  this._$element.find('[data-ticket-office-promo-code-element]').addClass('valid').removeClass('invalid');
            //}
            //this.orderConfig = this.getConfig().orderConfig;
            //this._initOrderConfig();
            this._updateSeatConfigList(this.getConfig().seatConfigList);
            //this._updateGapNotification(this.getConfig().gapNotification);
            this._processSeatsVisibility();
            $(window).resize(_.bind(function() {
                //this._updateInfoBlockSize();
            }, this));
            if (this.getConfig().initialZoneName && _zoneDataMap.hasOwnProperty(this.getConfig().initialZoneName)) {
                this.positionateToBorderOrigin(_zoneDataMap[this.getConfig().initialZoneName].borderOrigin, window.TRANSFORM_DURATION);
            }
            $('body').trigger('content-changed');
        }, this));
    };
    Js_HallMap.prototype.getViewportWidth = function() {
        return this._viewportWidth;
    };
    Js_HallMap.prototype.getViewportHeight = function() {
        return this._viewportHeight;
    };
    Js_HallMap.prototype.getElement = function() {
        return _$element[0];
    };
    Js_HallMap.prototype.getSvg = function() {
        return this._svg;
    };
    Js_HallMap.prototype.getStaticSeatPrimitiveList = function() {
        return this._staticSeatPrimitiveList;
    };
    Js_HallMap.prototype.getMinScale = function() {
        return this._minScale;
    };
    Js_HallMap.prototype.getMaxScale = function() {
        return this._maxScale;
    };
    Js_HallMap.prototype.getZoom = function() {
        return this._zoom;
    };
    Js_HallMap.prototype.getConfig = function() {
        return window.jsHallMapConfig;
    };
    Js_HallMap.prototype.makeContainerMatrix = function() {
        var translate, scale, translateMatrix, scaleMatrix;
        translate = this._zoom ? this._zoom.translate() : [0, 0];
        scale = this._zoom ? this._zoom.scale() : 1;
        translateMatrix = $M([
            [1, 0, translate[0]],
            [0, 1, translate[1]],
            [0, 1, 0]
        ]);
        scaleMatrix = $M([
            [scale, 0, 0],
            [0, scale, 0],
            [0, 0, 1]
        ]);
        return translateMatrix.multiply(scaleMatrix);
    };
    Js_HallMap.prototype.makeContainerMatrixInversed = function() {
        var translate, scale, translateMatrix, scaleMatrix;
        translate = this._zoom ? this._zoom.translate() : [0, 0];
        scale = this._zoom ? this._zoom.scale() : 1;
        translateMatrix = $M([
            [1, 0, -translate[0]],
            [0, 1, -translate[1]],
            [0, 1, 0]
        ]);
        scaleMatrix = $M([
            [1 / scale, 0, 0],
            [0, 1 / scale, 0],
            [0, 0, 1]
        ]);
        return scaleMatrix.multiply(translateMatrix);
    };
    Js_HallMap.prototype.getPrimitiveNodeScreenBorder = function(primitiveNode) {
        var containerMatrix, primitiveMatrix, bbox;
        bbox = $.data(primitiveNode, 'bbox');
        if (!bbox) {
            bbox = primitiveNode.getBBox();
        }
        primitiveMatrix = this.makePrimitiveMatrix(primitiveNode);
        containerMatrix = this.makeContainerMatrix();
        return this.applyMatrixToBBox(bbox, containerMatrix.multiply(primitiveMatrix));
    };
    Js_HallMap.prototype.positionateToBorderOrigin = function(borderOrigin, duration) {
        console.log('coming');
        var scale, translateX, translateY;
        scale = window.ZOOM_PADDING_MODIFICATOR / Math.max(borderOrigin.width / this._viewportWidth, borderOrigin.height / this._viewportHeight);
        if (scale > this._maxScale) {
            scale = this._maxScale;
        }
        if (scale < this._minScale) {
            scale = this._minScale;
        }
        translateX = (this._viewportWidth - scale * (borderOrigin.x2 + borderOrigin.x1)) / 2;
        translateY = (this._viewportHeight - scale * (borderOrigin.y2 + borderOrigin.y1)) / 2;
        this.transform([translateX, translateY], scale, duration);
    };
    Js_HallMap.prototype.transform = function(translate, scale, animationDuration) {
        console.log('trans');
        var intervalId, intervalCallback;
        if (this._isTransformInProcess) {
            return;
        }
        if (translate !== null) {
            this._zoom.translate(translate);
        }
        if (scale !== null) {
            this._zoom.scale(scale);
        }
        if (animationDuration > 0) {
            intervalCallback = _.bind(this._onTransform, this);
            this._container.transition().duration(animationDuration).attr('transform', 'translate(' + translate[0] + ', ' + translate[1] + ') scale(' + scale + ')').each('start', _.bind(function() {
                this._isTransformInProcess = true;
                if (intervalId) {
                    window.clearInterval(intervalId);
                }
                intervalId = window.setInterval(intervalCallback, 30);
            }, this)).each('end', _.bind(function() {
                console.log('trans');
                this._onTransformDone();
                this._isTransformInProcess = false;
                window.clearInterval(intervalId);
                intervalId = null;
            }, this));
        } else {
            this._container.attr('transform', 'translate(' + translate[0] + ', ' + translate[1] + ') scale(' + scale + ')');
            this._onTransform();
        }
    };
    Js_HallMap.prototype.scaleFromCenter = function(direction) {
        var center, translate, translate0, scale;
        center = [this._viewportWidth / 2, this._viewportHeight / 2];
        translate = this._zoom.translate();
        scale = this._zoom.scale() * (1 + 0.5 * direction);
        if (scale < this._minScale) {
            scale = this._minScale;
        }
        if (scale > this._maxScale) {
            scale = this._maxScale;
        }
        translate0 = [(center[0] - translate[0]) / this._zoom.scale(), (center[1] - translate[1]) / this._zoom.scale()];
        translate[0] += center[0] - (translate0[0] * scale + translate[0]);
        translate[1] += center[1] - (translate0[1] * scale + translate[1]);
        this.transform(translate, scale, window.TRANSFORM_DURATION);
    };
    window.Js_HallMap_magicCounter = 0;
    Js_HallMap.prototype.identify = function(primitive) {
        if (primitive.attr('id')) {
            return primitive.attr('id');
        } else {
            window.Js_HallMap_magicCounter++;
            primitive.attr('id', 'pr' + window.Js_HallMap_magicCounter);
            return primitive.attr('id');
        }
    };
    Js_HallMap.prototype.setPrimitiveData = function(primitive, data) {
        _.each(data, function(value, key) {
            if (!value) {
                value = null;
            }
            primitive.attr(key, value);
        }, this);
    };
    Js_HallMap.prototype._assembleMap = function() {
        if (this.getConfig().hallMapSvgUrl) {
            require(['text!' + this.getConfig().hallMapSvgUrl], _.bind(function(svgText) {
                $('div.jsHallMap-hallMapSvgContainer').html(svgText);
                assembleMap.call(this);
            }, this));
        }
        if ($('div.jsHallMap-hallMapSvgContainer svg').length) {
            assembleMap.call(this);
        }

        function assembleMap() {
            var $svg, isStageHere, areGeneralAdmissionSectionsHere, minSeatWidth, minSeatHeight, minGeneralAdmissionSectionWidth, minGeneralAdmissionSectionHeight, zoneNameList, maxSectionWidth, maxSectionHeight;
            isStageHere = false;
            areGeneralAdmissionSectionsHere = false;
            minSeatWidth = Infinity;
            minSeatHeight = Infinity;
            minGeneralAdmissionSectionWidth = Infinity;
            minGeneralAdmissionSectionHeight = Infinity;
            $svg = $('svg.hallMapSvg');
            if (!$svg.length) {
                throw this.ns + ': svg node was not found';
            }
            $svg.attr('width', this._viewportWidth);
            $svg.attr('height', this._viewportHeight);
            $svg.show();
            this._svg = d3.select($svg[0]);
            this._container = this._svg.select('g.container');
            this._genericContainer = this._svg.select('g.genericContainer');
            this._hallBorderOrigin = {
                x1: Infinity,
                y1: Infinity,
                x2: -Infinity,
                y2: -Infinity,
                width: 0,
                height: 0
            };
            this._mapWidth = -Infinity;
            this._mapHeight = -Infinity;
            zoneNameList = [];
            _.each($('.p'), function(primitiveNode) {
                var borderOrigin, primitive, bbox, zone, zoneData, zonePrimitiveNode, seatCount, seatGroupPrimitiveNode;
                primitive = d3.select(primitiveNode);
                bbox = primitiveNode.getBBox();
                zone = primitiveNode.parentNode.parentNode.getAttribute('z');
                if (zone && zoneNameList.indexOf(zone) === -1) {
                    zoneNameList.push(zone);
                }
                $.data(primitiveNode, 'bbox', bbox);
                try {
                    borderOrigin = this.applyMatrixToBBox(bbox, this.makePrimitiveMatrix(primitiveNode));
                } catch (ex) {
                    return;
                }
                $.data(primitiveNode, 'borderOrigin', borderOrigin);
                $.data(primitiveNode, 'centerXOrigin', 1 * borderOrigin.x1 + 1 * borderOrigin.width / 2);
                $.data(primitiveNode, 'centerYOrigin', 1 * borderOrigin.y1 + 1 * borderOrigin.height / 2);
                this._mapWidth = Math.max(borderOrigin.x2, this._mapWidth);
                this._mapHeight = Math.max(borderOrigin.y2, this._mapHeight);
                this._hallBorderOrigin.x1 = Math.min(borderOrigin.x1, this._hallBorderOrigin.x1);
                this._hallBorderOrigin.y1 = Math.min(borderOrigin.y1, this._hallBorderOrigin.y1);
                this._hallBorderOrigin.x2 = Math.max(borderOrigin.x2, this._hallBorderOrigin.x2);
                this._hallBorderOrigin.y2 = Math.max(borderOrigin.y2, this._hallBorderOrigin.y2);
                this._hallBorderOrigin.width = this._hallBorderOrigin.x2 - this._hallBorderOrigin.x1;
                this._hallBorderOrigin.height = this._hallBorderOrigin.y2 - this._hallBorderOrigin.y1;
                if (primitive.classed('s')) {
                    _staticSeatPrimitiveList.push(primitive);
                    minSeatWidth = Math.min(minSeatWidth, borderOrigin.width);
                    minSeatHeight = Math.min(minSeatHeight, borderOrigin.height);
                    this._areSeatsHere = true;
                    if (!primitive.classed('dummy')) {
                        this._initSeat(primitiveNode, primitive, zone, primitive.attr('r'), primitive.attr('p'));
                    }
                } else if (primitive.classed('stage')) {
                    if (isStageHere) {
                        throw this.ns + ': only one stage primitive is allowed!';
                    }
                    isStageHere = true;
                    this._initStage(primitiveNode, primitive.attr('direction'));
                } else if (primitive.classed('section')) {
                    zonePrimitiveNode = $(primitiveNode).parents('g.zone')[0];
                    seatCount = d3.select(zonePrimitiveNode).selectAll('.s')[0].length;
                    seatGroupPrimitiveNode = $(zonePrimitiveNode).find('g.seats');
                    zoneData = {
                        primitiveNode: zonePrimitiveNode,
                        seatGroupPrimitiveNode: seatGroupPrimitiveNode,
                        borderOrigin: borderOrigin
                    };
                    if (!seatCount) {
                        areGeneralAdmissionSectionsHere = true;
                        zoneData.generalAdmission = true;
                        minGeneralAdmissionSectionWidth = Math.min(minGeneralAdmissionSectionWidth, borderOrigin.width);
                        minGeneralAdmissionSectionHeight = Math.min(minGeneralAdmissionSectionHeight, borderOrigin.height);
                        if (typeof this._initGeneralAdmissionSection === 'function') {
                            this._initGeneralAdmissionSection(primitiveNode);
                        }
                    } else {
                        zoneData.seatAllocated = true;
                        this._initSeatAllocatedSection(primitiveNode);
                    }
                    _zoneDataMap[zone] = zoneData;
                }
            }, this);
            d3.selectAll('.s.dummy').remove();
            if (!this._areSeatsHere && !areGeneralAdmissionSectionsHere) {
                throw this.ns + ': there are no Seats or Areas in Object List';
            }
            if (!isStageHere) {
                throw this.ns + ': there is no stage in Object List';
            }
            if (this._areSeatsHere) {
                this._maxScale = 0.2 / Math.max(minSeatWidth / this._viewportWidth, minSeatHeight / this._viewportHeight);
            } else if (areGeneralAdmissionSectionsHere) {
                this._maxScale = window.ZOOM_PADDING_MODIFICATOR / Math.max(minGeneralAdmissionSectionWidth / this._viewportWidth, minGeneralAdmissionSectionHeight / this._viewportHeight);
            }
            this._minScale = ZOOM_PADDING_MODIFICATOR / Math.max(this._mapWidth / this._viewportWidth, this._mapHeight / this._viewportHeight);
            if (this._areSeatsHere) {
                maxSectionWidth = -Infinity;
                maxSectionHeight = -Infinity;

                _.each(_zoneDataMap, function(zoneData) {
                    if (zoneData.generalAdmission) {
                        return;
                    }
                    maxSectionWidth = Math.max(zoneData.borderOrigin.width, maxSectionWidth);
                    maxSectionHeight = Math.max(zoneData.borderOrigin.height, maxSectionHeight);
                }, this);

                if (maxSectionWidth > 0 && maxSectionHeight > 0) {
                    this._seatVisibilityScale = window.SECTION_SIZE_SEAT_VISBILITY_FACTOR / Math.max(maxSectionWidth / this._viewportWidth, maxSectionHeight / this._viewportHeight);
                    if (this._seatVisibilityScale < this._minScale) {
                        this._seatVisibilityScale = this._minScale;
                    }
                    if (this._seatVisibilityScale > this._maxScale) {
                        this._seatVisibilityScale = this._maxScale;
                    }
                } else {
                    throw this.ns + ': there are no sections';
                }
            } else {
                this._seatVisibilityScale = this._maxScale;
            }
            this._zoom = d3.behavior.zoom().scaleExtent([this._minScale, this._maxScale]).on('zoom', _.bind(this._onZoom, this)).on('zoomend', _.bind(this._onZoomEnd, this));
            this._zoomSelection = this._svg.call(this._zoom);
            this._zoomSelection.on('dblclick.zoom', null);
            this._afterHallMapSvgHasBeenAssembled();
            var svgPrimitive = d3.select($svg[0]);
            svgPrimitive.on('dblclick.zoom', null);
            $_loader.hide();
        }
    };
    Js_HallMap.prototype._initViewport = function() {
    	
        this._viewportWidth = window.innerWidth;
        this._viewportHeight = window.innerHeight;
        _$element.css({
            width: this._viewportWidth + 'px',
            height: this._viewportHeight + 'px',
            position: 'relative'
        });
        $(window).resize(_.bind(function() {
            this._viewportWidth = window.innerWidth;
            this._viewportHeight = window.innerHeight;
            _$element.css({
                width: this._viewportWidth + 'px',
                height: this._viewportHeight + 'px'
            });
            this._svg.attr('width', this._viewportWidth);
            this._svg.attr('height', this._viewportHeight);
            this._stage.positionate();
        }, this));
    };
    Js_HallMap.prototype._onZoom = function() {
        console.log('zoom');
        this._container.attr('transform', 'translate(' + d3.event.translate + ') scale(' + d3.event.scale + ')');
        this._onTransform();
    };
    Js_HallMap.prototype._onZoomEnd = function() {
        this._onTransform();
        this._onTransformDone();
    };
    Js_HallMap.prototype._onTransform = function() {
        console.log('ontransform');
        this._stage.trackStage();
    };
    Js_HallMap.prototype._onTransformDone = function() {
        console.log('onTransformDone');
        this._processSeatsVisibility();
    };
    Js_HallMap.prototype._onZoomMinusClick = function(event) {
        event.stopPropagation();
        this.scaleFromCenter(-1);
    };
    Js_HallMap.prototype._onZoomPlusClick = function(event) {
        console.log('zoolplucclick');
        event.stopPropagation();
        this.scaleFromCenter(1);
    };
    Js_HallMap.prototype._onBodyKeypress = function(event) {
        this._currentKey = d3.event.charCode;
    };
    Js_HallMap.prototype._onBodyKeyup = function(event) {
        this._currentKey = null;
    };
    Js_HallMap.prototype._initStage = function(primitiveNode, direction) {
        this._stage = new jsHallMapStage(this, primitiveNode, direction);
        this._stage.trackStage();
    };
  	Js_HallMap.prototype._processSeatState = function(primitiveNode, primitive, zone, row, place) {
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
    Js_HallMap.prototype._initSeat = function(primitiveNode, primitive, zone, row, place) {
        var tipHtml, isAvailable, that;
        
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
               // that._tip.hide();
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
     Js_HallMap.prototype._updateSeatConfigList = function(seatConfigList) {
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
    Js_HallMap.prototype._selectSeat = function(primitive, zone) {
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
    Js_HallMap.prototype._activateSeat = function(primitive, tipHtml) {
        if (tipHtml && !this._tip.isVisible()) {
            primitive.classed('hover', true);
            this._tip.show(tipHtml, primitive.node());
        }
    };
    Js_HallMap.prototype._deactivateAllSeats = function() {
        d3.select('.s.hover').classed('hover', false);
        this._tip.hide();
    };
    Js_HallMap.prototype._processSeatState = function(primitiveNode, primitive, zone, row, place) {
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
    Js_HallMap.prototype._initGeneralAdmissionSection = function(primitiveNode) {
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
    Js_HallMap.prototype._onApplySuperPosition = function() {
        console.log('onapplysuper');
        this.positionateToBorderOrigin(this._hallBorderOrigin, window.TRANSFORM_DURATION);
    };
    Js_HallMap.prototype._onPositionateToZone = function(event, zoneName) {
        console.log('onapplyszona');
        if (_zoneDataMap.hasOwnProperty(zoneName)) {
            this.positionateToBorderOrigin(_zoneDataMap[zoneName].borderOrigin, window.TRANSFORM_DURATION);
        }
    };
    Js_HallMap.prototype._onPositionateToSeat = function(event, zone, row, place) {
        console.log('onposiseat');
        throw this.ns + ': abstract method';
    };
    Js_HallMap.prototype.applyMatrixToBBox = function(bbox, matrix) {
        if (bbox.width <= 0 || bbox.height <= 0 || bbox.width >= Infinity || bbox.height >= Infinity) {
            throw this.ns + ': zero dimentions';
        }
        var
            x, y, perimeter, resultMatrix, borderBoxX1 = Infinity,
            borderBoxY1 = Infinity,
            borderBoxX2 = -Infinity,
            borderBoxY2 = -Infinity;
        x = bbox.x;
        y = bbox.y;
        perimeter = [
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0]
        ];
        resultMatrix = matrix.multiply($M([
            [x],
            [y],
            [1]
        ]));
        perimeter[0][0] = resultMatrix.elements[0][0];
        perimeter[0][1] = resultMatrix.elements[1][0];
        resultMatrix = matrix.multiply($M([
            [x + bbox.width],
            [y],
            [1]
        ]));
        perimeter[1][0] = resultMatrix.elements[0][0];
        perimeter[1][1] = resultMatrix.elements[1][0];
        resultMatrix = matrix.multiply($M([
            [x + bbox.width],
            [y + bbox.height],
            [1]
        ]));
        perimeter[2][0] = resultMatrix.elements[0][0];
        perimeter[2][1] = resultMatrix.elements[1][0];
        resultMatrix = matrix.multiply($M([
            [x],
            [y + bbox.height],
            [1]
        ]));
        perimeter[3][0] = resultMatrix.elements[0][0];
        perimeter[3][1] = resultMatrix.elements[1][0];
        _.each(perimeter, function(point) {
            if (point[0] < borderBoxX1) {
                borderBoxX1 = point[0];
            }
            if (point[1] < borderBoxY1) {
                borderBoxY1 = point[1];
            }
            if (point[0] > borderBoxX2) {
                borderBoxX2 = point[0];
            }
            if (point[1] > borderBoxY2) {
                borderBoxY2 = point[1];
            }
        });
        return {
            x1: borderBoxX1,
            y1: borderBoxY1,
            x2: borderBoxX2,
            y2: borderBoxY2,
            width: borderBoxX2 - borderBoxX1,
            height: borderBoxY2 - borderBoxY1
        };
    };
    Js_HallMap.prototype.makePrimitiveMatrix = function(primitiveNode) {
        var primitive, primitiveTransform, primitiveMatrix, transform;
        primitive = d3.select(primitiveNode);
        transform = primitive.attr('transform');
        if (transform) {
            if (transform.indexOf('matrix') !== -1) {
                primitiveTransform = primitive.attr('transform').split(/\(|\)/)[1].split(/\s/);
            } else {
                var svgMatrix = primitiveNode.getTransformToElement(primitiveNode.parentNode);
                primitiveTransform = [svgMatrix.a, svgMatrix.b, svgMatrix.c, svgMatrix.d, svgMatrix.e, svgMatrix.f];
            }
        } else {
            primitiveTransform = [1, 0, 0, 1, 0, 0];
        }
        primitiveMatrix = $M([
            [primitiveTransform[0], primitiveTransform[2], primitiveTransform[4]],
            [primitiveTransform[1], primitiveTransform[3], primitiveTransform[5]],
            [0, 0, 1]
        ]);
        return primitiveMatrix;
    };

    Js_HallMap.prototype._processSeatsVisibility = function() {

        var currentScale, self;
        if (!this._zone2SeatMap) {
            console.log('sassss');
            return;
        }
        currentScale = this._zoom.scale();
        self = this;
        console.log(this._seatVisibilityScale);
        console.log(currentScale);
        if (currentScale > this._seatVisibilityScale) {
            
            this._shouldHideSeats = true;

            this._container.classed('seatsAreHidden', false);
            this._container.classed('seatsAreVisible', true);
            var viewPortBorderOrigin = this.applyMatrixToBBox({
                x: 0,
                y: 0,
                width: this._viewportWidth,
                height: this._viewportHeight
            }, this.makeContainerMatrixInversed());
            _.each(_zoneDataMap, function(zoneData, zone) {
                var zonePrimitive = d3.select(zoneData.primitiveNode);
                if (!(zoneData.borderOrigin.x1 > viewPortBorderOrigin.x2 || zoneData.borderOrigin.x2 < viewPortBorderOrigin.x1 || zoneData.borderOrigin.y1 > viewPortBorderOrigin.y2 || zoneData.borderOrigin.y2 < viewPortBorderOrigin.y1)) {
                    if (!zonePrimitive.classed('seatsAreLoaded')) {
                        self._loadSeatsForZone(zone);
                        zonePrimitive.classed('seatsAreLoaded', true);
                    }
                } else {
                    if (zonePrimitive.classed('seatsAreLoaded')) {
                        d3.selectAll('[z="' + zone + '"] .s').remove();
                        zonePrimitive.classed('seatsAreLoaded', false);
                    }
                }
            });
        } else {
            if (this._shouldHideSeats) {
                this._shouldHideSeats = false;
                this._container.classed('seatsAreHidden', true);
                this._container.classed('seatsAreVisible', false);
                d3.selectAll('.s').remove();
                _.each(_zoneDataMap, function(zoneData) {
                    d3.select(zoneData.primitiveNode).classed('seatsAreLoaded', false);
                });
                //this._tip.hide();
            }
        }
    };
    Js_HallMap.prototype._onTransform = function() {
        if (this._tip) {
            this._tip.positionate();
        }
        if (this._stage) {
            this._stage.trackStage();
        }
    };
    Js_HallMap.prototype._loadSeatsForZone = function(zone) {
        var seatsPrimitive, seat, attributeMap, primitive, attributeNameAliasMap, isAvailableZone, seatingPositionList;
        attributeNameAliasMap = this._zone2SeatMap.__ATTRIBUTE_NAME_ALIAS_MAP__;
        seatsPrimitive = d3.select('[z="' + zone + '"] g.seats');
        isAvailableZone = this.getConfig().zoneConfigMap.hasOwnProperty(zone);
        seatingPositionList = this._zone2SeatMap[zone];
        for (var i = (seatingPositionList.length - 1); i >= 0; i--) {
            seat = seatingPositionList[i];
            attributeMap = {};
            for (var name in seat.a) {
                if (attributeNameAliasMap.hasOwnProperty(name)) {
                    attributeMap[attributeNameAliasMap[name]] = seat.a[name];
                } else {
                    attributeMap[name] = seat.a[name];
                }
            }
            primitive = seatsPrimitive.append(seat.t).attr(attributeMap);
            if (isAvailableZone) {
                this._initSeat(d3.select(primitive), primitive, zone, attributeMap.r, attributeMap.p);
            }
        }
    };
    Js_HallMap.prototype._initSeatAllocatedSection = function(primitiveNode) {
        var primitive = d3.select(primitiveNode);
        primitive.on('click', _.bind(function() {
            if (d3.event.defaultPrevented) {
                return;
            }
            if (!this._container.classed('seatsAreVisible')) {
                var primitiveNode = d3.event.target;
                this.positionateToBorderOrigin($.data(primitiveNode, 'borderOrigin'), window.TRANSFORM_DURATION);
            }
        }, this));
    };
    return Js_HallMap;
});