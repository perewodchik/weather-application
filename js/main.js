var startLatitude   = document.getElementById("start__latitude"),
    startLongtitude = document.getElementById("start__longtitude"),
    endLatitude     = document.getElementById("end__latitude"),
    endLongtitude   = document.getElementById("end__longtitude"),
    radioButtons    = document.getElementsByName("travel_type");
    submit          = document.getElementById("form__submit"),
    way             = undefined;
    myMap           = undefined,
    coords          = [0,0],
    myRoute         = undefined,
    myPlacemarks    = [],
    placemarkStart  = undefined;
    placemarkEnd    = undefined;
    travel_type     = undefined;

ymaps.ready(init); 

function init() {
    /*  Инициализация карты  */
    myMap = new ymaps.Map("map", {
        center: [54.724770, 20.527879], // Координаты центра карты
        zoom: 15                        // Маcштаб карты
    }); 

    myMap.controls.add(
        new ymaps.control.ZoomControl()  // Добавление элемента управления картой
    );

    //Выставляем флажки первичном заходе на сайт
    if([startLatitude.value, startLongtitude.value] != ["0","0"])
    {
        placemarkStart && myMap.geoObjects.remove(placemarkStart);
        placemarkStart = createPlacemark([startLatitude.value, startLongtitude.value], "img/placemark_start.png");
        myMap.geoObjects.add(placemarkStart);
    }
    if( [endLatitude.value, endLongtitude.value] != ["0","0"])
    {
        placemarkEnd && myMap.geoObjects.remove(placemarkEnd);
        placemarkEnd = createPlacemark([endLatitude.value, endLongtitude.value], "img/placemark_end.png");
        myMap.geoObjects.add(placemarkEnd);
    }
    
    /*Обработка клика для выбора стартовой и конечной позиции*/
    myMap.events.add('click', function (e) {
        if (!myMap.balloon.isOpen()) {
            coords = e.get('coords');

            /*Открываем балун с выбором позиции*/
            myMap.balloon.open(coords, {
                contentHeader:'Выберите позицию',
                contentBody:
                    '<div id="chooseStart">Стартовая позиция</div>'  +
                    '<div id="chooseEnd">Конечная позиция</div>',
                contentFooter:'<sup>Щелкните по позиции</sup>'
            }).then(function(balloon){

                /*Обрабатываем нажатия на стартовую/конечную позицию*/
                chooseStart = document.getElementById("chooseStart");
                chooseEnd = document.getElementById("chooseEnd");

                chooseStart.addEventListener('click', function(){ 
                    startLatitude.value = coords[0];
                    startLongtitude.value = coords[1];
                    myMap.balloon.close();

                    placemarkStart && myMap.geoObjects.remove(placemarkStart);
                    placemarkStart = createPlacemark([startLatitude.value, startLongtitude.value], "img/placemark_start.png");
                    myMap.geoObjects.add(placemarkStart);
                }, false);

                chooseEnd.addEventListener('click', function(){ 
                    endLatitude.value = coords[0];
                    endLongtitude.value = coords[1];
                    myMap.balloon.close();

                    placemarkEnd && myMap.geoObjects.remove(placemarkEnd);
                    placemarkEnd = createPlacemark([endLatitude.value, endLongtitude.value], "img/placemark_end.png");
                    myMap.geoObjects.add(placemarkEnd);
                }, false);
            })
        }
        else {
            myMap.balloon.close();
        }
    });
}
    
/*Обработчик события для кнопки "проложить маршрут"*/
submit.addEventListener('click', function(e) {
    for(var i = 0; i < radioButtons.length; i++){
        if(radioButtons[i].checked){
            travel_type = radioButtons[i].value;
            break;
        }
    }

    /* Создаем маршрут в виде промиса */
    route = new ymaps.route([
        [startLatitude.value, startLongtitude.value],
        //....
        [endLatitude.value, endLongtitude.value],    
    ], 
    { 
        routingMode: travel_type,
        mapStateAutoApply: true,
        multiRoute: true
    }).then(function(route) {
        myRoute && myMap.geoObjects.remove(myRoute.getPaths());
        route.getWayPoints().options.set("visible", false);
        myRoute = route.getRoutes().get(0);

        myRoute.getPaths().options.set({strokeColor: '0000ffff', strokeWidth: 5, opacity: 0.9});

        /*Удаляем бесполезную иконку*/
        myRoute.getPaths().options.set("iconImageHref", "img/placemark_end.png");
        myRoute.getPaths().options.set("iconLayout", "default#imageWithContent");
        myRoute.getPaths().options.set("iconImageSize", [0,0])

        myMap.geoObjects.add(myRoute.getPaths());
        //Очищаем предыдущие метки
        for(var i = 0; i < myPlacemarks.length; i++)
            myMap.geoObjects.remove(myPlacemarks[i]);
        myPlacemarks = [];
        myPlacemarks.push(placemarkStart);

        /* Получаем ключевые точки */
        lastPoint = myPlacemarks[0].geometry.getCoordinates();
        for (var i = 0; i < myRoute.getPaths().getLength(); i++) {
            way = myRoute.getPaths().get(i);
            refPoints = way.properties.get('coordinates');
            for(var j = 0; j < refPoints.length; j++)
            {
                if(ymaps.coordSystem.geo.getDistance(lastPoint, refPoints[j]) >= 1000)
                {
                    lastPoint = refPoints[j];
                    myPlacemark = createPlacemark(refPoints[j], "img/rain.png");
                    myPlacemarks.push(myPlacemark);
                    updatePlacemarkWithWeather(refPoints[j], 12, myPlacemark);
                    console.log("pushed placemark");
                }
            }
        }
        //выводим наши плейсмарки на карту
        for(var i = 0; i < myPlacemarks.length; i++)
            myMap.geoObjects.add(myPlacemarks[i]);
    }); 
});

function updatePlacemarkWithWeather(coords, time, placemark) {
    const proxyurl = "https://cors-anywhere.herokuapp.com/";
    const url = "https://api.weather.yandex.ru/v1/forecast?lat=" + coords[0] + "&lon=" + coords[1] + "&extra=true";
    let ans = fetch(proxyurl + url, {
        headers: {
            'X-Yandex-API-Key': '3ca8def8-6851-461a-a026-86bce3750c16'
        },
    }).then(response => response.json()).then(contents => contents).catch(() => console.log("ad"));

    ans.then(function(contents){
        var temp = contents.forecasts[0].hours[time].temp,
            icon = contents.forecasts[0].hours[time].icon,
            wind_speed = contents.forecasts[0].hours[time].wind_speed,
            wind_dir = contents.forecasts[0].hours[time].wind_dir,
            condition = contents.forecasts[0].hours[time].condition,
            icon = contents.forecasts[0].hours[time].icon;

        placemark.properties.set("hintContent", temp);
        placemark.options.set("iconImageHref", 'https://yastatic.net/weather/i/icons/blueye/color/svg/' + icon + '.svg');
        console.log("updated");
    });
}

function createPlacemark(coords, img_link)
{
    var placemark = new ymaps.Placemark(coords, {
        //...
    }, {
        iconLayout: 'default#image',
        iconImageHref: img_link,
        iconImageSize: [48, 48],
        iconImageOffset: [-16, -48],
    });
    return placemark;
}