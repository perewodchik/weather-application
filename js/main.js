
var travel_type         = document.getElementById("travel_type"),
    weatherBar          = document.getElementById("weather"),
    submit              = document.getElementById("form__submit"),
    clearRouteButton    = document.getElementById("form__clearRoute"),
    way                 = undefined,
    map                 = undefined,
    myRoute             = undefined,
    weatherPlacemarks   = [],
    windDirections      = [],
    waypointMarks       = [],
    currentDate         = new Date(),
    placemarkH          = undefined;

ymaps.ready(init);
 
function init() {
    /*  Инициализация карты  */
    map = new ymaps.Map("map", {
        center: [54.724770, 20.527879], // Координаты центра карты
        zoom: 15                        // Маcштаб карты
    }); 

    map.controls.add(
        new ymaps.control.ZoomControl()  // Добавление элемента управления картой
    );
    map.copyrights.add('Weatherly 2020');
    map.cursors.push('pointer');
    
    /*Обработка клика для выбора стартовой и конечной позиции*/
    map.events.add('click', function (e) {
        if (!map.balloon.isOpen()) {
            coords = e.get('coords');
            console.log(coords);

            var minSpeed = 1,
                maxSpeed = 1000,
                defaultSpeed = 10;
                    
            switch(travel_type.value)
            {
                case "pedestrian": 
                    maxSpeed = 12;
                    defaultSpeed = 4;
                    break;
                case "bicycle":
                    maxSpeed = 36;
                    defaultSpeed = 16;
                    break;
                case "auto":
                    maxSpeed = 120;
                    defaultSpeed = 40;
                    break;
            }

            /*Открываем балун с выбором позиции*/
            map.balloon.open(coords, {
                contentHeader:'Выберите позицию',
                contentBody: '<div id="choosePoint">Добавить точку</div> \
                    <input type="range" id="input__speed" name="speed" \
                    min="1" max="' + maxSpeed + '" value="' + defaultSpeed + 
                    '"><div id="speedometer">'+ defaultSpeed +' км/ч</div>'
            }).then(function(balloon){


                input__speed = document.getElementById("input__speed");
                input__speed.addEventListener("input", function(e) {
                    document.getElementById("speedometer").textContent = input__speed.value + " км/ч";
                });

                /*Обрабатываем нажатия на стартовую/конечную позицию*/
                choostPoint = document.getElementById("choosePoint");
                choosePoint.addEventListener('click', function(){ 
                    map.balloon.close();

                    placemark = createPlacemark(coords, {image:"img/waypoint.png"});

                    if(waypointMarks.length == 0)
                    {
                        placemark.options.set("iconImageHref", "img/waypoint0.png");
                    }
                    if(waypointMarks.length > 0)
                    {
                        if(waypointMarks.length > 1)
                            waypointMarks[waypointMarks.length-1].options.set(
                                "iconImageHref", "img/waypoint" + (waypointMarks.length-1).toString() + ".png");
                        placemark.options.set("iconImageHref", "img/waypoint10.png");
                    }
                
                    placemark.options.set("speed", input__speed.value);
                    if(waypointMarks.length <= 10)
                    {
                        map.geoObjects.add(placemark);
                        waypointMarks.push(placemark);
                    }
                    else
                    {
                        map.geoObjects.remove(waypointMarks[waypointMarks.length-1]);
                        waypointMarks[waypointMarks.length-1] = placemark;
                        map.geoObjects.add(placemark);
                    }
                }, false);

            })
        }
        else {
            map.balloon.close();
        }
    });

    document.getElementById("header__logo").addEventListener("click", function(e) {
        if(placemarkH == undefined){
            placemarkH = createPlacemark([30.037800439414188, 31.25028483728282], {image:"img/hint.png"});
            map.geoObjects.add(placemarkH);
        }
        else{
            alert("removed");
            map.geoObjects.remove(placemarkH);
            placemarkH = undefined;
        }
    });
}

clearRouteButton.addEventListener('click', clearRoute);

    
/*Обработчик события для кнопки "проложить маршрут"*/
submit.addEventListener('click', function(e) {
    if(waypointMarks.length  <= 1)
        return;

    /* Создаем маршрут в виде промиса */

    route = new ymaps.route(getCoordinatesFromPlacemarks(waypointMarks),
    { 
        routingMode: travel_type.value,
        mapStateAutoApply: true,
        multiRoute: true
    }).then(function(route) {
        myRoute && map.geoObjects.remove(myRoute.getPaths());
        myRoute = undefined;
        route.getWayPoints().options.set("visible", false);
        myRoute = route.getRoutes().get(0);

        //Очищаем предыдущие метки
        for(var i = 0; i < weatherPlacemarks.length; i++)
            map.geoObjects.remove(weatherPlacemarks[i]);
        weatherPlacemarks = [];
        for(var i = 0; i < windDirections.length; i++)
            map.geoObjects.remove(windDirections[i]);
        windDirections = [];
        weatherBar.innerHTML = "";
        
        if(myRoute == undefined){
            clearRoute({});
            alert("Не удалось проложить маршрут. Попробуйте изменить опорные точки и/или тип маршрута");
            return;
        }

        var routeDistance = myRoute.properties.get("distance").value;

        myRoute.getPaths().options.set({strokeColor: '0000ffff', strokeWidth: 5, opacity: 0.9});

        /*Удаляем бесполезную иконку*/
        myRoute.getPaths().options.set("iconImageHref", "img/placemark_end.png");
        myRoute.getPaths().options.set("iconLayout", "default#imageWithContent");
        myRoute.getPaths().options.set("iconImageSize", [0,0]);

        map.geoObjects.add(myRoute.getPaths());

        
        
        if(waypointMarks.length == 2)
        {
            var lastPoint = waypointMarks[0].geometry.getCoordinates();
            var minDistance = getMinDistanceBetweenPoints(routeDistance);
            console.log(minDistance);
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
                        waypointMark.options.set("speed", waypointMarks[0].options.get("speed"));
                        map.geoObjects.add(waypointMark);
                        waypointMarks.splice(counter, 0, waypointMark);
                        counter++;
                    }
                }
            }
        }
        

        var dateAtWaypoint = new Date();
        var cards = [];
        for(var i = 0; i < waypointMarks.length; i++)
        {
            if(i != 0)
            {
                var distanceBetweenPoints = ymaps.coordSystem.geo.getDistance(
                    waypointMarks[i-1].geometry.getCoordinates(), 
                    waypointMarks[i].geometry.getCoordinates());
                    dateAtWaypoint.setSeconds(dateAtWaypoint.getSeconds()
                     + distanceBetweenPoints / (waypointMarks[i-1].options.get("speed") / 3.6));
            }
            weatherPlacemark = createPlacemark(waypointMarks[i].geometry.getCoordinates(), {image: "img/loading.gif", iconImageOffset: [8,-24]});
            weatherPlacemarks.push(weatherPlacemark);
            cards.push(createCard({
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
            map.geoObjects.add(weatherPlacemarks[i]);
          
        distanceHeader = document.createElement("h2");
        distanceHeader.textContent = "Протяженность маршрута: " + (Math.round((routeDistance/1000 + Number.EPSILON) * 100) / 100).toString() + " км"; 
        weatherBar.appendChild(distanceHeader);
        for(var i = 0; i < cards.length; i++)
            weatherBar.appendChild(cards[i]);

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
        map.geoObjects.add(windPlacemark);

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
    return distance / Math.min(10, Math.floor( Math.log(distance/1000) / Math.log(1.7)) );
}

function clearRoute(e) {
    /*удаляем информацию о погоде*/
    weatherBar.innerHTML = '<p>Добро пожаловать! Weatherly - это сайт, благодаря которому Вы сможете не только проложить маршрут, но и узнать погоду на нем. </p><p>Кликните на карту и нажмите "Добавить точку", чтобы указать стартовую позицию, аналогично добавляйте остальные точки маршрута. В правом окне выберите тип перемещения и задайте скорость. Остается только нажать   "Проложить маршрут". </p><p>И помните, что лучше потратить минуту на просмотр маршрута, чем столкнуться с неожиданностями в пути.</p>';
    /*Удаляем плейсмарки*/
    for(var i = 0; i < waypointMarks.length; i++)
        map.geoObjects.remove(waypointMarks[i]);
    waypointMarks = [];
    /*Удаляем состояние погоды*/
    for(var i = 0; i < weatherPlacemarks.length; i++)
            map.geoObjects.remove(weatherPlacemarks[i]);
        weatherPlacemarks = [];
    /*Удаляем направления ветра*/
    for(var i = 0; i < windDirections.length; i++)
            map.geoObjects.remove(windDirections[i]);
        windDirections = [];
    /*Удаляем маршрут*/
    myRoute && map.geoObjects.remove(myRoute.getPaths());
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



//DON'T EVEN LOOK AT IT !!!
//It's copypasted for custom select

var x, i, j, l, ll, selElmnt, a, b, c;
/* Look for any elements with the class "custom-select": */
x = document.getElementsByClassName("custom-select");
l = x.length;
for (i = 0; i < l; i++) {
  selElmnt = x[i].getElementsByTagName("select")[0];
  ll = selElmnt.length;
  /* For each element, create a new DIV that will act as the selected item: */
  a = document.createElement("DIV");
  a.setAttribute("class", "select-selected");
  a.innerHTML = selElmnt.options[selElmnt.selectedIndex].innerHTML;
  x[i].appendChild(a);
  /* For each element, create a new DIV that will contain the option list: */
  b = document.createElement("DIV");
  b.setAttribute("class", "select-items select-hide");
  for (j = 1; j < ll; j++) {
    /* For each option in the original select element,
    create a new DIV that will act as an option item: */
    c = document.createElement("DIV");
    c.innerHTML = selElmnt.options[j].innerHTML;
    c.addEventListener("click", function(e) {
        /* When an item is clicked, update the original select box,
        and the selected item: */
        var y, i, k, s, h, sl, yl;
        s = this.parentNode.parentNode.getElementsByTagName("select")[0];
        sl = s.length;
        h = this.parentNode.previousSibling;
        for (i = 0; i < sl; i++) {
          if (s.options[i].innerHTML == this.innerHTML) {
            s.selectedIndex = i;
            h.innerHTML = this.innerHTML;
            y = this.parentNode.getElementsByClassName("same-as-selected");
            yl = y.length;
            for (k = 0; k < yl; k++) {
              y[k].removeAttribute("class");
            }
            this.setAttribute("class", "same-as-selected");
            break;
          }
        }
        h.click();
    });
    b.appendChild(c);
  }
  x[i].appendChild(b);
  a.addEventListener("click", function(e) {
    /* When the select box is clicked, close any other select boxes,
    and open/close the current select box: */
    e.stopPropagation();
    closeAllSelect(this);
    this.nextSibling.classList.toggle("select-hide");
    this.classList.toggle("select-arrow-active");
  });
}

function closeAllSelect(elmnt) {
  /* A function that will close all select boxes in the document,
  except the current select box: */
  var x, y, i, xl, yl, arrNo = [];
  x = document.getElementsByClassName("select-items");
  y = document.getElementsByClassName("select-selected");
  xl = x.length;
  yl = y.length;
  for (i = 0; i < yl; i++) {
    if (elmnt == y[i]) {
      arrNo.push(i)
    } else {
      y[i].classList.remove("select-arrow-active");
    }
  }
  for (i = 0; i < xl; i++) {
    if (arrNo.indexOf(i)) {
      x[i].classList.add("select-hide");
    }
  }
}

/* If the user clicks anywhere outside the select box,
then close all select boxes: */
document.addEventListener("click", closeAllSelect);