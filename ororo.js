/**
 *  Ororo plugin for Movian Media Center
 *
 *  Copyright (C) 2020 czz78
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var html = require('movian/html');
var OroroApi = require('./libs/api');
var page = require('movian/page');
var store = require('movian/store');
var service =require('movian/service');
var plugin = JSON.parse(Plugin.manifest);
var popup = require('native/popup');

var logo = Plugin.path + plugin.icon;

function setPageHeader(page, title) {

    if (page.metadata) {
        page.metadata.title = title;
        page.metadata.logo = logo;
    }

}


function login(page, credentials){

    page.options.createAction('Login', 'Login', function() {

            var result = popup.textDialog('Enter the username:', true, true);

            if (!result.rejected && result.input) {

                var username = result.input;

                var result = popup.textDialog('Enter the password:', true, true);

                if (!result.rejected && result.input) {

                    credentials.username = encodeURIComponent(username);
                    credentials.password = encodeURIComponent(result.input);

                    popup.notify("Credentials have been set", 2);
                    page.flush();
                    //                    page.redirect(plugin.id + ':start');
                    page.redirect(plugin.id + ':start');
                }
            }
    });

}


// Istances
service.create(plugin.id, plugin.id + ":start", "tv", true, logo);


var credentials = store.create('credentials');
if (!credentials.username) credentials.username = '';
if (!credentials.password) credentials.password = '';


/*
 *  Search bar
 *  It redirects for search files
 */
new page.Route(plugin.id + ":search:(.*)", function(page, query) {

    page.type = "directory";
    page.loading = true;
    setPageHeader(page, decodeURIComponent(query));

    var ororo = new OroroApi({username : decodeURIComponent(credentials.username),password: decodeURIComponent(credentials.password)} , { debug: true, lang: "EN"} );
    var movies = ororo.movies();
    var shows = ororo.shows();

    for(var i in movies){
        var re = new RegExp(query, "i");
        if(re.exec(movies[i].title)){
           page.appendItem(plugin.id + ':play:movie:'+ movies[i].id  , 'video', movies[i]);
       }

    }

    for(var i in shows){
       var re = new RegExp(query, "i");
       if(re.exec(shows[i].title)){
           page.appendItem(plugin.id + ':show:' + encodeURIComponent(shows[i].title) + ':' + encodeURIComponent(shows[i].icon) + ':' + shows[i].id  , 'video', shows[i]);
       }
    }

    page.loading = false;

});


/*
 * Play
 */
new page.Route(plugin.id + ":play:(.*):(.*)", function(page, action, id) {

    var ororo = new OroroApi({username : decodeURIComponent(credentials.username),password: decodeURIComponent(credentials.password)} , { debug: true, lang: "EN"} );

    var file;
    if(action == 'show') {
        file = ororo.episode(id);
    }
    else {
        file = ororo.movie(id);
    }
    //    file.no_fs_scan=1;
    //    file.no_subtitle_scan=1;

    page.loading = false;

    page.source = "videoparams:" + JSON.stringify(file);
    page.type = 'video';

});


/*
 *  Show
 */
new page.Route(plugin.id + ":show:(.*):(.*):(.*)", function(page, title, icon, id) {

    setPageHeader(page, decodeURIComponent(title));
    page.type = "directory";
    page.loading = true;

    var ororo = new OroroApi({username : decodeURIComponent(credentials.username),password: decodeURIComponent(credentials.password)} , { debug: true } );
    var episodes = ororo.episodes(id);

    if(episodes) {
        for (var i in episodes) {


            episodes[i].icon= decodeURIComponent(icon);
            page.appendItem(plugin.id + ':play:show:'+ episodes[i].id  , 'video', episodes[i]);
        }

        setPageHeader(page,"Shows" + ' ('+ i.toString()+ ' results)');
    }

    page.loading = false;

});


/*
 *  Shows
 */
new page.Route(plugin.id + ":shows", function(page) {

    setPageHeader(page, "Shows");
    page.type = "directory";
    page.loading = true;

    var ororo = new OroroApi({username : decodeURIComponent(credentials.username),password: decodeURIComponent(credentials.password)} , { debug: true, lang: "EN"} );
    var shows = ororo.shows();

    if(shows) {
        for (var i in shows) {
            page.appendItem(plugin.id + ':show:' + encodeURIComponent(shows[i].title) + ':' + encodeURIComponent(shows[i].icon) + ':' + shows[i].id  , 'video', shows[i]);
        }

        setPageHeader(page,"Shows" + ' ('+ i.toString()+ ' results)');
    }

    page.loading = false;

});


/*
 *  Movies
 */
new page.Route(plugin.id + ":movies", function(page) {

    setPageHeader(page, "Movies");
    page.type = "directory";
    page.loading = true;

    var ororo = new OroroApi({username : decodeURIComponent(credentials.username),password: decodeURIComponent(credentials.password)} , { debug: true } );
    var movies = ororo.movies();

    if(movies) {
        for (var i in movies) {
            page.appendItem(plugin.id + ':play:movie:'+ movies[i].id  , 'video', movies[i]);
        }

        setPageHeader(page,"Movies" + ' ('+ i.toString()+ ' results)');
    }

    page.loading = false;

});


/*
 *  First page
 *  It shows the menu
 */
new page.Route(plugin.id + ":start", function(page) {


    setPageHeader(page, 'Ororo Tv');
    page.loading = true;

    var ororo = new OroroApi({username : decodeURIComponent(credentials.username),password: decodeURIComponent(credentials.password)} , { debug: true, lang: "EN"} );

    if(ororo.login()){
        page.type = "directory";
        page.model.contents= 'grid';

        page.appendItem(plugin.id + ":search:", 'search', {
            title: "Search on Ororo"
        });

        page.appendPassiveItem('separator','',{title: ''});
        page.appendItem(plugin.id + ':movies' , 'directory', {title:'Movies', icon: Plugin.path+ "images/vod.png"} );
        page.appendItem(plugin.id + ':shows' , 'directory', {title: 'Series', icon: Plugin.path+ "images/series.png"} );

    }
    else {
        page.type = "directory";
        page.model.contents= 'list';
        page.appendItem(plugin.id + ':start' , 'directory', {title:'reload', icon: Plugin.path+ "images/reload.png"} );
        page.appendPassiveItem('separator','',{title: 'Not Logged in, use login button on right menu.\n'});
    }

    login(page, credentials);

    page.loading = false;

});
