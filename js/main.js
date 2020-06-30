
var travel_type         = document.getElementById("travel_type"),
    speedInput          = document.getElementById("input__speed"),
    submit              = document.getElementById("form__submit"),
    clearRouteButton    = document.getElementById("form__clearRoute"),
    weatherBar          = document.getElementById("weather"),
    speed               = document.getElementById("input__speed"),
    way                 = undefined,
    coords              = [0,0],
    myMap               = undefined,
    myRoute             = undefined,
    weatherPlacemarks   = [],
    windDirections      = [],
    travel_type         = undefined;
    waypointMarks       = [];
    currentDate         = new Date(); 

document.getElementById("span__speed").textContent = speedInput.value;
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
                        placemark.options.set("iconImageHref", "img/waypoint0.png");
                    }
                    if(waypointMarks.length > 0)
                    {
                        if(waypointMarks.length > 1)
                            waypointMarks[waypointMarks.length-1].options.set("iconImageHref", "img/waypoint" + (waypointMarks.length-1).toString() + ".png");
                        placemark.options.set("iconImageHref", "img/waypoint6.png");
                    }
                
                    if(waypointMarks.length <= 6)
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
speedInput.addEventListener("input", function(e){
    document.getElementById("span__speed").textContent = speedInput.value;
})
    
/*Обработчик события для кнопки "проложить маршрут"*/
submit.addEventListener('click', function(e) {
    if(waypointMarks.length  <= 1)
        return;

    // for(var i = 0; i < radioButtons.length; i++){
    //     if(radioButtons[i].checked){
    //         travel_type = radioButtons[i].value;
    //         break;
    //     }
    // }

    /* Создаем маршрут в виде промиса */

    route = new ymaps.route(getCoordinatesFromPlacemarks(waypointMarks),
    { 
        routingMode: document.getElementById("travel_type").value,
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
        weatherBar.innerHTML = "";
        
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
            //(params.time / 10 > 0) ? params.time : "0" + params.time.toString()
            weatherBar.appendChild(createCard({
                id: i,
                time: dateAtWaypoint.getHours().toString() + ":" + 
                (dateAtWaypoint.getMinutes().toString().length == 1 ? "0" : "") +
                dateAtWaypoint.getMinutes().toString(),
                imageWaypoint: waypointMarks[i].options.get("iconImageHref")
            }));

            handleWeather(waypointMarks[i].geometry.getCoordinates(), 
                new Date(dateAtWaypoint.getTime()),  weatherPlacemark, i);
        }

        
        //выводим наши плейсмарки на карту
        for(var i = 0; i < weatherPlacemarks.length; i++)
            myMap.geoObjects.add(weatherPlacemarks[i]);
            
    }); 
});



function handleWeather(coords, date, placemark, number) {
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
            temp:       contents.forecasts[daysLag].hours[dateHours].temp,
            icon:       contents.forecasts[daysLag].hours[dateHours].icon,
            wind_speed: contents.forecasts[daysLag].hours[dateHours].wind_speed,
            wind_dir:   contents.forecasts[daysLag].hours[dateHours].wind_dir,
            condition:  contents.forecasts[daysLag].hours[dateHours].condition
        };

        placemark.properties.set("hintContent", weather_info.temp);
        placemark.options.set("iconImageHref", "https://yastatic.net/weather/i/icons/blueye/color/svg/" + weather_info.icon + ".svg");
        windPlacemark = createPlacemark(coords, {image: "img/" + weather_info.wind_dir + ".png", iconImageOffset: [8,-56]});
        windDirections.push(windPlacemark);
        myMap.geoObjects.add(windPlacemark);

        updateCard(number, weather_info);

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
    /*удаляем информацию о погоде*/
    weatherBar.innerHTML = "";
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

function createCard(params){
    weather__card = document.createElement("div");
    weather__card.className = "weather__card ";
    weather__card.id = "card_" + params.id;

    wrapper__waypoint_time = document.createElement("div");
    wrapper__waypoint_time.className = "wrapper__waypoint_time";
    weather__card.appendChild(wrapper__waypoint_time);

    card__waypoint = document.createElement("img");
    card__waypoint.className = "card__waypoint";
    card__waypoint.src = params.imageWaypoint;
    wrapper__waypoint_time.appendChild(card__waypoint);

    card__time = document.createElement("div");
    card__time.className = "card__time";
    card__time.textContent = params.time;
    wrapper__waypoint_time.appendChild(card__time);

    wrapper__temp_wind = document.createElement("div");
    wrapper__temp_wind.className = "wrapper__temp_wind";
    weather__card.appendChild(wrapper__temp_wind);

    card__temp = document.createElement("div");
    card__temp.className = "card__temp";
    card__temp.textContent = "°С";// to be updated
    wrapper__temp_wind.appendChild(card__temp)

    card__wind = document.createElement("div");
    card__wind.className = "card__wind";
    card__wind.textContent = ""; //to be updated
    wrapper__temp_wind.appendChild(card__wind);

    card__condition = document.createElement("img");
    card__condition.className = "card__condition";
    card__condition.src = "img/loading.gif"; //to be updated
    weather__card.appendChild(card__condition);

    return weather__card;
}

function updateCard(index, params){
    card = document.getElementById("card_" + index.toString());
    temp = card.children[1].children[0];
    wind = card.children[1].children[1];
    condition = card.children[2];
    temp.textContent = params.temp.toString() + "°С";
    wind.textContent = params.wind_speed + "м/с " + params.wind_dir;
    condition.src = 'https://yastatic.net/weather/i/icons/blueye/color/svg/' + params.icon + '.svg';
}