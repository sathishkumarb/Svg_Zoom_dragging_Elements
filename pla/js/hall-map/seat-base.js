define(['jquery', 'underscore', 'utils', 'hall-map'], function($, _, Utils, JsHallMap) {
    'use strict';
    var HallMapSeatBase = function() {
        HallMapSeatBase.parent.constructor.call(this);
    };
    Utils.extendClass(HallMapSeatBase, JsHallMap);
    HallMapSeatBase.prototype._processSeatsVisibility = function() {
        var currentScale, self;
        if (!this._zone2SeatMap) {
            return;
        }
        currentScale = this._zoom.scale();
        self = this;
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
            _.each(this._zoneDataMap, function(zoneData, zone) {
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
                _.each(this._zoneDataMap, function(zoneData) {
                    d3.select(zoneData.primitiveNode).classed('seatsAreLoaded', false);
                });
                this._tip.hide();
            }
        }
    };
    HallMapSeatBase.prototype._onTransform = function() {
        if (this._tip) {
            this._tip.positionate();
        }
        if (this._stage) {
            this._stage.trackStage();
        }
    };
    HallMapSeatBase.prototype._loadSeatsForZone = function(zone) {
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
    HallMapSeatBase.prototype._initSeatAllocatedSection = function(primitiveNode) {
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
    return HallMapSeatBase;
});