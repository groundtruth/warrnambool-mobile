// API key for http://openlayers.org. Please get your own at http://bingmapsportal.com/ and use that instead.
var apiKey = "AqTGBsziZHIJYYxgivLBf0hVdrAk9mWO5cQcb8Yux8sW5M8c8opEC2lZqKR1ZZXf";

var map,
    fhLayer,
    drainage_pit_layer,
    getFeatures,
    clickedFeature,
    selectControl;
var gg = new OpenLayers.Projection("EPSG:4326");
var sm = new OpenLayers.Projection("EPSG:900913");
var limit_feature = 20;

var init = function() {

    var vector = new OpenLayers.Layer.Vector("GPS position", {});

    // The style's context function has the correspondance between a status code and a color
    var fhLayer = new OpenLayers.Layer.Vector("Drainage Pits", {
        styleMap: new OpenLayers.StyleMap({
            "default": new OpenLayers.Style(
                {
                    graphicName: "square",
                    strokeColor: "#000000",
                    fillColor: "${getFillColor}",
                    strokeWidth: 1,
                    strokeOpacity: 1,
                    fillOpacity: 0.75,
                    pointRadius: 7,
                    // Labelling of features - missing the halo though ..
                    label: "${a_id}",
                    fontColor: "black",
                    fontWeight: "900",
                    fontSize: "14px",
                    fontFamily: "Arial",
                    labelAlign: "cm",
                    labelOutlineColor: "white",
                    labelYOffset: "-15",
                    labelOutlineWidth: 3
                },
                {
                    context: {
                        getFillColor: function(feature) {
                            if (feature.attributes.i_status == "0")
                            return '#585858';
                            else if (feature.attributes.i_status == "1")
                            return '#0B6121';
                        }
                    }
                }
            )
        })
    });

    var geolocate = new OpenLayers.Control.Geolocate({
        id: 'locate-control',
        geolocationOptions: {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 20000
        },
        failure: function(e) {
            switch (e.error.code) {
                case 0: alert(OpenLayers.i18n("There was an error while retrieving your location: ") + e.error.message); break;
                case 1: alert(OpenLayers.i18n("The user didn't accept to provide the location: ")); break;
                case 2: alert(OpenLayers.i18n("The browser was unable to determine your location: ") + e.error.message); break;
                case 3: alert(OpenLayers.i18n("The browser timed out before retrieving the location.")); break;
            }
        }
    });

    drainage_pit_layer = new OpenLayers.Layer.WMS(
        "Drainage Pits",
        "http://v3.pozi.com/geoserver/WARRNAMBOOL/wms",
        { layers: 'WSC_DRAINAGE_PIT', format: 'image/png8', transparent: 'true' },
        { isBaseLayer: false, singleTile: true, ratio: 1.5 }
    );

    // create map
    map = new OpenLayers.Map({
        div: "map",
        theme: null,
        projection: sm,
        units: "m",
        numZoomLevels: 22,
        maxResolution: 156543.0339,
        maxExtent: new OpenLayers.Bounds(-20037508.34, -20037508.34, 20037508.34, 20037508.34),
        controls: [
            new OpenLayers.Control.Attribution(),
            new OpenLayers.Control.TouchNavigation({
                dragPanOptions: {
                    interval: 100,
                    enableKinetic: true
                }
            }),
            geolocate
        ],
        layers: [
            new OpenLayers.Layer.WMS(
                "Labels",
                ["http://m1.pozi.com/geoserver/wms", "http://m2.pozi.com/geoserver/wms", "http://m3.pozi.com/geoserver/wms", "http://m4.pozi.com/geoserver/wms"],
                { layers: 'LabelClassic', format: 'image/png8', transparent: 'true' },
                { isBaseLayer: false, singleTile: true, ratio: 1.5 }
            ),
            drainage_pit_layer,
            new OpenLayers.Layer.WMS(
                "Vicmap Classic",
                ["http://m1.pozi.com/geoserver/gwc/service/wms", "http://m2.pozi.com/geoserver/gwc/service/wms", "http://m3.pozi.com/geoserver/gwc/service/wms", "http://m4.pozi.com/geoserver/gwc/service/wms"],
                { layers: 'VicmapClassic', format: 'image/png8' },
                { transitionEffect: 'resize' }
            ),
            new OpenLayers.Layer.OSM("OpenStreetMap", null, { transitionEffect: 'resize' }),
            new OpenLayers.Layer.Bing({
                key: apiKey,
                type: "Road",
                name: "Bing Road",
                transitionEffect: 'resize'
            }),
            new OpenLayers.Layer.Bing({
                key: apiKey,
                type: "Aerial",
                name: "Bing Aerial",
                transitionEffect: 'resize'
            }),
            new OpenLayers.Layer.Bing({
                key: apiKey,
                type: "AerialWithLabels",
                name: "Bing Aerial + Labels",
                transitionEffect: 'resize'
            }),
            vector,
            fhLayer
        ],
        center: new OpenLayers.LonLat(15861010, -4634024),
        zoom: 19
    });

    map.events.register('moveend', this, function() { getFeatures(); });

    var style = {
        fillOpacity: 0.1,
        fillColor: '#000',
        strokeColor: '#f00',
        strokeOpacity: 0.6
    };
    
    geolocate.events.register("locationupdated", this, function(e) {
        // Logging the event values
        var pt = new OpenLayers.LonLat(e.point.x, e.point.y);
        var pt_google = pt.transform(gg, sm);

        // var logMsg = "X=" + e.point.x + " (" + pt_google.lon + ")";
        // logMsg = logMsg + "\n" + "Y=" + e.point.y + " (" + pt_google.lat + ")";
        // logMsg = logMsg + "\n" + "Accuracy=" + e.position.coords.accuracy;
        //	alert(logMsg);

        vector.removeAllFeatures();
        vector.addFeatures([
            new OpenLayers.Feature.Vector(
                e.point,
                {},
                {
                    graphicName: 'cross',
                    strokeColor: '#f00',
                    strokeWidth: 2,
                    fillOpacity: 0,
                    pointRadius: 10
                }
            ),
            new OpenLayers.Feature.Vector(
                OpenLayers.Geometry.Polygon.createRegularPolygon(
                    new OpenLayers.Geometry.Point(e.point.x, e.point.y),
                    e.position.coords.accuracy / 2,
                    50,
                    0
                ),
                {},
                style
            )
        ]);
        // Zoom to the disc derived from GPS position and accuracy, with a max zoom level of 17
        var z = map.getZoomForExtent(vector.getDataExtent());
        map.setCenter(pt_google, Math.min(z, 18));
    });

    geolocate.events.register("locationfailed", this, function(e) {
        switch (e.error.code) {
            case 0: alert(OpenLayers.i18n("There was an error while retrieving your location: ") + e.error.message); break;
            case 1: alert(OpenLayers.i18n("The user didn't accept to provide the location: ")); break;
            case 2: alert(OpenLayers.i18n("The browser was unable to determine your location: ") + e.error.message); break;
            case 3: alert(OpenLayers.i18n("The browser timed out before retrieving the location.")); break;
        }
    });

    getFeatures = function() {
      
        var ll = map.getCenter();
        var ll_wgs84 = ll.transform(sm, gg);

        var reader = new OpenLayers.Format.GeoJSON();

        Ext.util.JSONP.request({
            url: 'http://v3.pozi.com/ws/rest/v3/ws_drainage_pit_geojson.php',
            params: {
                lat: ll_wgs84.lat,
                lon: ll_wgs84.lon,
                limit: limit_feature,
                config: 'warrnamboolgis',
                lga: '369'
            },
            callbackKey: 'callback',
            callback: function(resp) {
                // resp is the XmlHttpRequest object
                var fh_from_geojson = reader.read(resp);
                // Before blindly adding, we should compare to the features already in there and decide to not include duplicates - duplicates can be found using the id of the features
                // Or more simply, we could just remove all the features form the layer
                fhLayer.removeAllFeatures();
                fhLayer.addFeatures(fh_from_geojson);
            }
        });

    };

    // Loading features in the fire hazard layer - AJAX GeoJSON
    getFeatures();

};
