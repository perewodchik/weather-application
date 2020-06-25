var startLatitude   = document.getElementById("start__latitude"),
    startLongtitude = document.getElementById("start__longtitude"),
    endLatitude     = document.getElementById("end__latitude"),
    endLongtitude   = document.getElementById("end__longtitude"),
    radioButtons    = document.getElementsByName("travel_type"),
    speedInput      = document.getElementById("input__speed");
    submit          = document.getElementById("form__submit"),
    weatherBar      = document.getElementById("weather");
    way             = undefined,
    coords          = [0,0],
    myMap           = undefined,
    myRoute         = undefined,
    myPlacemarks    = [],
    windDirections  = [],
    placemarkStart  = undefined,
    placemarkEnd    = undefined,
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
        placemarkStart = createPlacemark([startLatitude.value, startLongtitude.value], {image: "img/placemark_start.png"});
        myMap.geoObjects.add(placemarkStart);
    }
    if( [endLatitude.value, endLongtitude.value] != ["0","0"])
    {
        placemarkEnd && myMap.geoObjects.remove(placemarkEnd);
        placemarkEnd = createPlacemark([endLatitude.value, endLongtitude.value], {image: "img/placemark_end.png"});
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
                    placemarkStart = createPlacemark([startLatitude.value, startLongtitude.value], {image:"img/placemark_start.png"});
                    myMap.geoObjects.add(placemarkStart);
                }, false);

                chooseEnd.addEventListener('click', function(){ 
                    endLatitude.value = coords[0];
                    endLongtitude.value = coords[1];
                    myMap.balloon.close();

                    placemarkEnd && myMap.geoObjects.remove(placemarkEnd);
                    placemarkEnd = createPlacemark([endLatitude.value, endLongtitude.value], {image: "img/placemark_end.png"});
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
        for(var i = 0; i < windDirections.length; i++)
            myMap.geoObjects.remove(windDirections[i]);
        windDirections = [];
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
                    myPlacemark = createPlacemark(refPoints[j], {image: "img/loading.gif"});
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

speedInput.addEventListener("input", function(e){
    document.getElementById("span__speed").textContent = speedInput.value;
})

function updatePlacemarkWithWeather(coords, time, placemark) {
    const proxyurl = "https://cors-anywhere.herokuapp.com/";
    const url = "https://api.weather.yandex.ru/v1/forecast?lat=" + coords[0] + "&lon=" + coords[1] + "&extra=true";
    let ans = fetch(proxyurl + url, {
        headers: {
            'X-Yandex-API-Key': '3ca8def8-6851-461a-a026-86bce3750c16'
        },
    }).then(response => response.json()).then(contents => contents).catch(() => console.log("ad"));

    ans.then(function(contents){
        weather_info = {
            temp: contents.forecasts[0].hours[time].temp,
            icon: contents.forecasts[0].hours[time].icon,
            wind_speed: contents.forecasts[0].hours[time].wind_speed,
            wind_dir: contents.forecasts[0].hours[time].wind_dir,
            condition: contents.forecasts[0].hours[time].condition
        };

        placemark.properties.set("hintContent", weather_info.temp);
        placemark.options.set("iconImageHref", 'https://yastatic.net/weather/i/icons/blueye/color/svg/' + weather_info.icon + '.svg');
        windPlacemark = createPlacemark(coords, {image: "img/" + weather_info.wind_dir + ".png", iconImageOffset: [-16,0]});
        windDirections.push(windPlacemark);
        myMap.geoObjects.add(windPlacemark);

    });
}

function createPlacemark(coords, params = {})
{
    var placemark = new ymaps.Placemark(coords, {
        //...
        
    }, {
        iconLayout: 'default#image',
        iconImageHref:   params.image           || "img/logo.ong",
        iconImageSize:   params.iconImageSize   || [48, 48],
        iconImageOffset: params.iconImageOffset || [-16, -48],
        iconOffset:      params.iconOffset      || [0,0],
        offset:          params.offset          || [0,0]
    });
    //placemark.options.set("iconOffset", params.iconOf);
    return placemark;
}

function createCard(coords, params){

    weather__card = document.createElement("div");
    weather__card.className = "weather__card";

    card__time = document.createElement("div");
    card__time.className = "card__time";
    card__time.textContent = params.time;
    weather__card.appendChild(card__time);

    card__descriptionWrapper = document.createElement("div");
    card__descriptionWrapper.className = "card__descriptionWrapper";
    weather__card.appendChild(card__descriptionWrapper);

    card__image = document.createElement("div");
    card__image.className = "card__image";
    card__descriptionWrapper.appendChild(card__image);

    img = document.createElement("img");
    img.src = params.image;
    card__image.appendChild(img);
    
    card__infoWrapper = document.createElement("div");
    card__infoWrapper.className = "card__infoWrapper";
    card__descriptionWrapper.appendChild(card__infoWrapper);

    card__temperature = document.createElement("div");
    card__temperature.className = "card__temperature";
    card__temperature.textContent = "Температура: " + params.temp + "°C";
    card__infoWrapper.appendChild(card__temperature);

    card__wind = document.createElement("div");
    card__wind.className = "card__wind";
    card__wind.textContent = "Ветер: " + params.wind_speed + " " + params.wind_dir;
    card__infoWrapper.appendChild(card__wind);

    card__condition = document.createElement("div");
    card__condition.className = "card__condition";
    card__condition.textContent = params.condition;
    card__infoWrapper.appendChild(card__condition);

    return weather__card;
}