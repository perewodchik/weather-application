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
        placemarkStart = undefined;
        placemarkEnd = undefined;
    
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

        MyIconContentLayout = ymaps.templateLayoutFactory.createClass(
            '<div style="color: #FFFFFF; font-weight: bold;">$[properties.iconContent]</div>'
        );

        if( [startLatitude.value, startLongtitude.value] != ["0","0"])
        {
            placemarkStart && myMap.geoObjects.remove(placemarkStart);
            placemarkStart = new ymaps.Placemark([startLatitude.value, startLongtitude.value], {
                hintContent: 'Стартовая позиция',
                balloonContent: Number(startLatitude.value).toPrecision(6).toString() + ", " +  Number(startLongtitude.value).toPrecision(6).toString(),
                iconContent: 'S'
            }, {
                iconLayout: 'default#imageWithContent',
                iconImageHref: 'img/placemark_start.png',
                iconImageSize: [48, 48],
                iconImageOffset: [-16, -48],
                iconContentOffset: [15, 10],
                iconContentLayout: MyIconContentLayout
            });
            myMap.geoObjects.add(placemarkStart);
        }
        if( [endLatitude.value, endLongtitude.value] != ["0","0"])
        {
            placemarkEnd && myMap.geoObjects.remove(placemarkEnd);
            placemarkEnd = new ymaps.Placemark([endLatitude.value, endLongtitude.value], {
                hintContent: 'Конечная позиция',
                balloonContent: Number(endLatitude.value).toPrecision(6).toString() + ", " +  Number(endLongtitude.value).toPrecision(6).toString(),
                iconContent: 'F'
            }, {
                iconLayout: 'default#imageWithContent',
                iconImageHref: 'img/placemark_end.png',
                iconImageSize: [48, 48],
                iconImageOffset: [-16, -48],
                iconContentOffset: [15, 10],
                iconContentLayout: MyIconContentLayout
            });
            myMap.geoObjects.add(placemarkEnd);
        }
        
        /*Обработка клика для выбора стартовой и конечной позиции*/
        myMap.events.add('click', function (e) {
            if (!myMap.balloon.isOpen()) {
                coords = e.get('coords');
    
                myMap.balloon.open(coords, {
                    contentHeader:'Выберите позицию',
                    contentBody:
                        '<div id="chooseStart">Стартовая позиция</div>'  +
                        '<div id="chooseEnd">Конечная позиция</div>',
                    contentFooter:'<sup>Щелкните по позиции</sup>'
                }).then(function(balloon){

                    chooseStart = document.getElementById("chooseStart");
                    chooseEnd = document.getElementById("chooseEnd");
    
                    chooseStart.addEventListener('click', function(){ 
                        startLatitude.value = coords[0];
                        startLongtitude.value = coords[1];
                        myMap.balloon.close();

                        placemarkStart && myMap.geoObjects.remove(placemarkStart);
                        placemarkStart = new ymaps.Placemark([startLatitude.value, startLongtitude.value], {
                            hintContent: 'Стартовая позиция',
                            balloonContent: Number(startLatitude.value).toPrecision(3).toString() + ", " +  Number(startLongtitude.value).toPrecision(3).toString(),
                            iconContent: 'S'
                        }, {
                            iconLayout: 'default#imageWithContent',
                            iconImageHref: 'img/placemark_start.png',
                            iconImageSize: [48, 48],
                            iconImageOffset: [-16, -48],
                            iconContentOffset: [15, 10],
                            iconContentLayout: MyIconContentLayout
                        });
                        myMap.geoObjects.add(placemarkStart);


                    }, false);
    
                    chooseEnd.addEventListener('click', function(){ 
                        endLatitude.value = coords[0];
                        endLongtitude.value = coords[1];
                        myMap.balloon.close();

                        placemarkEnd && myMap.geoObjects.remove(placemarkEnd);
                        placemarkEnd = new ymaps.Placemark([endLatitude.value, endLongtitude.value], {
                            hintContent: 'Конечная позиция',
                            balloonContent: Number(endLatitude.value).toPrecision(3).toString() + ", " +  Number(endLongtitude.value).toPrecision(3).toString(),
                            iconContent: 'F'
                        }, {
                            iconLayout: 'default#imageWithContent',
                            iconImageHref: 'img/placemark_end.png',
                            iconImageSize: [48, 48],
                            iconImageOffset: [-16, -48],
                            iconContentOffset: [15, 10],
                            iconContentLayout: MyIconContentLayout
                        });
                        myMap.geoObjects.add(placemarkEnd);



                    }, false);
                })
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
            myRoute && myMap.geoObjects.remove(myRoute.getPaths());
            route.getPaths().options.set({strokeColor: '0000ffff', strokeWidth: 5, opacity: 0.9});
            myMap.geoObjects.add((myRoute = route).getPaths());
        
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
                iconContent: 'Начало Пути',
                balloonContent: 'Балун',
                hintContent: 'Стандартный значок метки'
            }, 
            {
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
                                hintContent: segments[j].getStreet(),
                                balloonContent: "<p>22 C</p><p>5 м/c</p>",
                                iconContent: ''
                            }, {
                                iconLayout: 'default#imageWithContent',
                                iconImageHref: 'img/placemark_sun.png',
                                iconImageSize: [48, 48],
                                iconImageOffset: [-16, -48],
                                iconContentOffset: [15, 10],
                                iconContentLayout: MyIconContentLayout
                            });

                            //добавляем точку в массив
                            myPlacemarks.push(myPlacemark);
                            
                        }
                    }
                }
            }
            //выводим наши плейсмарки на карту
             for(var i = 1; i < myPlacemarks.length; i++)
                 myMap.geoObjects.add(myPlacemarks[i]);
        }); 
    });


}