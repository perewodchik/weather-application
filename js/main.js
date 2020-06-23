window.onload = function()
{
    var startLatitude = document.getElementById("start__latitude"),
        startLongtitude = document.getElementById("start__longtitude"),
        endLatitude = document.getElementById("end__latitude"),
        endLongtitude = document.getElementById("end__longtitude"),
        submit = document.getElementById("form__submit"),
        myMap = undefined,
        coords = [0,0],
        myRoute = undefined,
        myPlacemarks = [],
        way = undefined;
    
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
            
        myMap.events.add('click', function (e) {
            if (!myMap.balloon.isOpen()) {
                coords = e.get('coords');
    
                myMap.balloon.open(coords, {
                    contentHeader:'Выберите позицию',
                    contentBody:
                        '<p id="chooseStart">Стартовая позиция</p>'  +
                        '<p id="chooseEnd">Конечная позиция</p>' + [
                        coords[0].toPrecision(6),
                        coords[1].toPrecision(6)
                        ].join(', ') + '</p>',
                    contentFooter:'<sup>Щелкните по позиции</sup>'
                });
    
                setTimeout(function(){
                    chooseStart = document.getElementById("chooseStart");
                    chooseEnd = document.getElementById("chooseEnd");
    
                    chooseStart.addEventListener('click', function(){ 
                        startLatitude.value = coords[0];
                        startLongtitude.value = coords[1];
                        myMap.balloon.close();
                    }, false);
    
                    chooseEnd.addEventListener('click', function(){ 
                        endLatitude.value = coords[0];
                        endLongtitude.value = coords[1];
                        myMap.balloon.close();
                    }, false);
                }, 200);
            }
            else {
                myMap.balloon.close();
            }
        });
    }
        
    /*Обработчик события для кнопки "проложить маршрут" */
    submit.addEventListener('click', function(e) {
        /* Создаем маршрут в виде промиса */
        route = new ymaps.route([
            [startLatitude.value, startLongtitude.value],
            [endLatitude.value, endLongtitude.value],    
        ], 
        { 
            //routingMode: "pedestrian",
            mapStateAutoApply: true,
            //multiRoute: true
        })
        .then(function(route) {
            myRoute && myMap.geoObjects.remove(myRoute);
            myMap.geoObjects.add(myRoute = route);
        
            /*Маршрут от начальной точки до конечной состоит из ПУТЕЙ
                каждый путь состоит из СЕГМЕНТОВ
                у сегмента мы берем точки и проверяем,
                если расстояние с предыдущей маркой больше километра
            */

            //Очищаем предыдущие метки
            for(var i = 0; i < myPlacemarks.length; i++)
                myMap.geoObjects.remove(myPlacemarks[i]);
            myPlacemarks = [];

           myPlacemark = new ymaps.Placemark(
               [startLatitude.value, startLongtitude.value], {
                // Свойства.
                // Содержимое иконки, балуна и хинта.
                iconContent: 'Начало Пути',
                balloonContent: 'Балун',
                hintContent: 'Стандартный значок метки'
            }, 
            {
                // Опции.
                // Стандартная фиолетовая иконка.
                preset: 'twirl#redIcon'
            });
            myPlacemarks.push(myPlacemark);

            /* Получаем ключевые точки */
            for (var i = 0; i < myRoute.getPaths().getLength(); i++) {
                way = myRoute.getPaths().get(i);
                var segments = way.getSegments();

                console.log("Длина пути: " + way.getLength());
                console.log("Время прохождения пути: " + way.getTime());


                for (var j = 0; j < segments.length; j++) {
                    //получаем массив координат точек
                    placemarkCoords = segments[j].getCoordinates();
                    //обрабатываем каждую точка из сегмента
                    for(var k = 0; k < placemarkCoords.length; k++)
                    {
                        if(myPlacemarks.length == 0 
                        ||  ymaps.coordSystem.geo.getDistance(
                                myPlacemarks[myPlacemarks.length - 1].geometry.getCoordinates(), 
                                placemarkCoords[k]) >= 1000)
                        {
                            //создаем плейсмарку
                            myPlacemark = new ymaps.Placemark(placemarkCoords[k], {
                                // Свойства.
                                // Содержимое иконки, балуна и хинта.
                                iconContent: '1',
                                balloonContent: 'Балун',
                                hintContent: 'Стандартный значок метки'
                            }, 
                            {
                                // Опции.
                                // Стандартная фиолетовая иконка.
                                preset: 'twirl#violetIcon'
                            });

                            //добавляем точку в массив
                            myPlacemarks.push(myPlacemark);
                            
                        }
                    }
                }
            }
            //выводим наши плейсмарки на карту
            for(var i = 0; i < myPlacemarks.length; i++)
                myMap.geoObjects.add(myPlacemarks[i]);
        }); 
    });
}