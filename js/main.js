var startLatitude       = document.getElementById("start__latitude"),
    startLongtitude     = document.getElementById("start__longtitude"),
    endLatitude         = document.getElementById("end__latitude"),
    endLongtitude       = document.getElementById("end__longtitude"),
    radioButtons        = document.getElementsByName("travel_type"),
    speedInput          = document.getElementById("input__speed");
    submit              = document.getElementById("form__submit"),
    clearRouteButton    = document.getElementById("form__clearRoute");
    weatherBar          = document.getElementById("weather");
    speed               = document.getElementById("input__speed");
    way                 = undefined,
    coords              = [0,0],
    myMap               = undefined,
    myRoute             = undefined,
    weatherPlacemarks   = [],
    windDirections      = [],
    travel_type         = undefined;
    waypointMarks       = [];
    currentDate         = new Date(); 

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
    
    /*Обработка клика для выбора стартовой и конечной позиции*/
    myMap.events.add('click', function (e) {
        if (!myMap.balloon.isOpen()) {
            coords = e.get('coords');

            /*Открываем балун с выбором позиции*/
            myMap.balloon.open(coords, {
                contentHeader:'Выберите позицию',
                contentBody: '<div id="choosePoint">Добавить точку</div>',
                contentFooter:'<sup>Щелкните по позиции</sup>'
            }).then(function(balloon){

                /*Обрабатываем нажатия на стартовую/конечную позицию*/
                choostPoint = document.getElementById("choosePoint");

                choosePoint.addEventListener('click', function(){ 
                    myMap.balloon.close();

                    placemark = createPlacemark(coords, {image:"img/waypoint.png"});

                    if(waypointMarks.length == 0)
                    {
                        startLatitude.value = coords[0];
                        startLongtitude.value = coords[1];
                        placemark.options.set("iconImageHref", "img/start.png");
                    }
                    if(waypointMarks.length > 0)
                    {
                        if(waypointMarks.length > 1)
                            waypointMarks[waypointMarks.length-1].options.set("iconImageHref", "img/waypoint" + (waypointMarks.length-1).toString() + ".png");
                        placemark.options.set("iconImageHref", "img/finish.png");
                        endLatitude.value = coords[0];
                        endLongtitude.value = coords[1];
                    }
                
                    
                    
                    if(waypointMarks.length <= 4)
                    {
                        myMap.geoObjects.add(placemark);
                        waypointMarks.push(placemark);
                    }
                    else
                    {
                        myMap.geoObjects.remove(waypointMarks[waypointMarks.length-1]);
                        waypointMarks[waypointMarks.length-1] = placemark;
                        myMap.geoObjects.add(placemark);
                    }
                }, false);

            })
        }
        else {
            myMap.balloon.close();
        }
    });
}

clearRouteButton.addEventListener('click', clearRoute)
    
/*Обработчик события для кнопки "проложить маршрут"*/
submit.addEventListener('click', function(e) {
    if(waypointMarks.length  == 1)
        return;

    for(var i = 0; i < radioButtons.length; i++){
        if(radioButtons[i].checked){
            travel_type = radioButtons[i].value;
            break;
        }
    }

    /* Создаем маршрут в виде промиса */

    route = new ymaps.route(getCoordinatesFromPlacemarks(waypointMarks),
    { 
        routingMode: travel_type,
        mapStateAutoApply: true,
        multiRoute: true
    }).then(function(route) {
        myRoute && myMap.geoObjects.remove(myRoute.getPaths());
        myRoute = undefined;
        route.getWayPoints().options.set("visible", false);
        myRoute = route.getRoutes().get(0);

        //Очищаем предыдущие метки
        for(var i = 0; i < weatherPlacemarks.length; i++)
            myMap.geoObjects.remove(weatherPlacemarks[i]);
        weatherPlacemarks = [];
        for(var i = 0; i < windDirections.length; i++)
            myMap.geoObjects.remove(windDirections[i]);
        windDirections = [];
        
        if(myRoute == undefined){
            clearRoute({});
            alert("Не удалось проложить маршрут. Попробуйте изменить опорные точки и/или тип маршрута");
            return;
        }


        myRoute.getPaths().options.set({strokeColor: '0000ffff', strokeWidth: 5, opacity: 0.9});

        /*Удаляем бесполезную иконку*/
        myRoute.getPaths().options.set("iconImageHref", "img/placemark_end.png");
        myRoute.getPaths().options.set("iconLayout", "default#imageWithContent");
        myRoute.getPaths().options.set("iconImageSize", [0,0]);

        myMap.geoObjects.add(myRoute.getPaths());

        
        if(waypointMarks.length == 2)
        {
            var lastPoint = waypointMarks[0].geometry.getCoordinates();
            var minDistance = getMinDistanceBetweenPoints(myRoute.properties.get("distance").value);
            var counter = 1;
            for (var i = 0; i < myRoute.getPaths().getLength(); i++) {
                var way = myRoute.getPaths().get(i);
                var refPoints = way.properties.get('coordinates');
                for(var j = 0; j < refPoints.length; j++)
                {
                    var distanceBetweenPoints = ymaps.coordSystem.geo.getDistance(lastPoint, refPoints[j]);
                    if(distanceBetweenPoints >= minDistance)
                    {
                        lastPoint = refPoints[j];
                        waypointMark = createPlacemark(refPoints[j], {image:"img/waypoint" + counter.toString() + ".png"});
                        
                        myMap.geoObjects.add(waypointMark);
                        waypointMarks.splice(counter, 0, waypointMark);
                        counter++;
                    }
                }
            }
        }

        var dateAtWaypoint = new Date();
        speedInMetersPerSecond = speed.value / 3.6;
        for(var i = 0; i < waypointMarks.length; i++)
        {
            if(i != 0)
            {
                var distanceBetweenPoints = ymaps.coordSystem.geo.getDistance(
                    waypointMarks[i-1].geometry.getCoordinates(), 
                    waypointMarks[i].geometry.getCoordinates());
                    dateAtWaypoint.setSeconds(dateAtWaypoint.getSeconds() + distanceBetweenPoints / speedInMetersPerSecond);
            }
            weatherPlacemark = createPlacemark(waypointMarks[i].geometry.getCoordinates(), {image: "img/loading.gif", iconImageOffset: [8,-24]});
            weatherPlacemarks.push(weatherPlacemark);
            updatePlacemarkWithWeather(waypointMarks[i].geometry.getCoordinates(), 
                new Date(dateAtWaypoint.getTime()),  weatherPlacemark);
        }

        
        //выводим наши плейсмарки на карту
        for(var i = 0; i < weatherPlacemarks.length; i++)
            myMap.geoObjects.add(weatherPlacemarks[i]);
            
    }); 
});

speedInput.addEventListener("input", function(e){
    document.getElementById("span__speed").textContent = speedInput.value;
})

function updatePlacemarkWithWeather(coords, date, placemark) {
    const proxyurl = "https://cors-anywhere.herokuapp.com/";
    const url = "https://api.weather.yandex.ru/v1/forecast?lat=" + coords[0] + "&lon=" + coords[1] + "&extra=true";
    let ans = fetch(proxyurl + url, {
        headers: {
            'X-Yandex-API-Key': '3ca8def8-6851-461a-a026-86bce3750c16'
        },
    }).then(response => response.json()).then(contents => contents).catch(() => console.log("Could not get weather"));

    ans.then(function(contents){

        daysLag = getDayInYear(date) - getDayInYear(currentDate);
        
        if(daysLag > 2)
            daysLag = 2;
        dateHours = (date.getMinutes() >= 30 ? date.getHours() + 1: date.getHours());
        if(dateHours > 23)
            dateHours = 23;
        weather_info = {
            temp: contents.forecasts[daysLag].hours[dateHours].temp,
            icon: contents.forecasts[daysLag].hours[dateHours].icon,
            wind_speed: contents.forecasts[daysLag].hours[dateHours].wind_speed,
            wind_dir: contents.forecasts[daysLag].hours[dateHours].wind_dir,
            condition: contents.forecasts[daysLag].hours[dateHours].condition
        };
        console.log(weather_info);

        placemark.properties.set("hintContent", weather_info.temp);
        placemark.options.set("iconImageHref", 'https://yastatic.net/weather/i/icons/blueye/color/svg/' + weather_info.icon + '.svg');
        windPlacemark = createPlacemark(coords, {image: "img/" + weather_info.wind_dir + ".png", iconImageOffset: [8,-56]});
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
        iconImageOffset: params.iconImageOffset || [-24, -48],
        iconOffset:      params.iconOffset      || [0,0],
        offset:          params.offset          || [0,0],
        content:         params.content         || "time"
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

function getCoordinatesFromPlacemarks(placemarks)
{
    coordsList = [];
    for(var i = 0; i < placemarks.length; i++)
        coordsList.push(placemarks[i].geometry.getCoordinates());
    
    return coordsList;
}

function getMinDistanceBetweenPoints(distance)
{
    if(distance < 2000)
        return distance * 2; 
    else if(distance < 4000)
        return distance / 2;
    else if(distance < 8000)
        return distance / 3;
    else
        return distance / 4;
}


function clearRoute(e) {
    /*Очищаем поля*/
    startLatitude.value = 0;
    startLongtitude.value = 0;
    endLatitude.value = 0;
    endLongtitude.value = 0;
    /*Удаляем плейсмарки*/
    for(var i = 0; i < waypointMarks.length; i++)
        myMap.geoObjects.remove(waypointMarks[i]);
    waypointMarks = [];
    /*Удаляем состояние погоды*/
    for(var i = 0; i < weatherPlacemarks.length; i++)
            myMap.geoObjects.remove(weatherPlacemarks[i]);
        weatherPlacemarks = [];
    /*Удаляем направления ветра*/
    for(var i = 0; i < windDirections.length; i++)
            myMap.geoObjects.remove(windDirections[i]);
        windDirections = [];
    /*Удаляем маршрут*/
    myRoute && myMap.geoObjects.remove(myRoute.getPaths());
}

function getDayInYear(date){
    var start = new Date(date.getFullYear(), 0, 0);
    var diff = date - start;
    var oneDay = 1000 * 60 * 60 * 24;
    var day = Math.floor(diff / oneDay);
    return day;
}