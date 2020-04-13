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


var DEBUG = true;

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
new page.Route(plugin.id + ":search:(.*):(.*)", function(page, action, query) {

    page.type = "directory";
    page.loading = true;
    setPageHeader(page, decodeURIComponent(query));

    var ororo = new OroroApi({username : decodeURIComponent(credentials.username),password: decodeURIComponent(credentials.password)} , { debug: DEBUG } );
    var movies = ororo.movies();
    var shows = ororo.shows();

    if(action == 'all'){  // we could remove elements wich are movies instead of reparsing the url
        page.appendItem(plugin.id + ':search:movies:'+ decodeURIComponent(query)  , 'directory', {title:"FILTER BY MOVIES"});
        page.appendItem(plugin.id + ':search:shows:'+ decodeURIComponent(query)  , 'directory', {title:"FILTER BY SERIES"});
    }

    if(action == 'all' || action == "movies"){
        for(var i in movies){
            var re = new RegExp(query, "i");
            if(re.exec(movies[i].title)){
                page.appendItem(plugin.id + ':play:movie:'+ movies[i].id  , 'video', movies[i]);
            }

        }
    }

    if(action == 'all' || action == "shows"){
        for(var i in shows){
            var re = new RegExp(query, "i");
            if(re.exec(shows[i].title)){
                page.appendItem(plugin.id + ':show:' + encodeURIComponent(shows[i].title) + ':' + encodeURIComponent(shows[i].icon) + ':' + shows[i].id  , 'video', shows[i]);
            }
        }
    }
    page.loading = false;

});


/*
 * Play
 */
new page.Route(plugin.id + ":play:(.*):(.*)", function(page, action, id) {

    var ororo = new OroroApi({username : decodeURIComponent(credentials.username),password: decodeURIComponent(credentials.password)} , { debug: DEBUG } );

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

    var ororo = new OroroApi({username : decodeURIComponent(credentials.username),password: decodeURIComponent(credentials.password)} , { debug: DEBUG } );
    var episodes = ororo.episodes(id);

    if(episodes) {

        setPageHeader(page, decodeURIComponent(title) + ' ('+ episodes.length.toString()+ ' results)');
        var offset = 0;

        function loader() {

            if(offset > episodes.length) {
                page.haveMore(false);
                return;
            }

            for(var i = 0; i < 20; i++) {
                var episode = episodes[offset+i];
                if(episode ){
                    episode.icon=decodeURIComponent(icon);
                    page.appendItem(plugin.id + ':play:show:'+ episode.id  , 'video', episode);
                }
            }

            offset += 20;
            page.haveMore(true);

        }

    }

    page.type = "directory";
    page.asyncPaginator = loader;
    loader();

    page.loading = false;

});


/*
 *  Shows
 */
new page.Route(plugin.id + ":shows", function(page) {

    setPageHeader(page, "Shows");
    page.type = "directory";
    page.loading = true;

    var ororo = new OroroApi({username : decodeURIComponent(credentials.username),password: decodeURIComponent(credentials.password)} , { debug: DEBUG } );
    var shows = ororo.shows();

    if(shows) {

        setPageHeader(page,"Shows" + ' ('+ shows.length.toString()+ ' results)');
        var offset = 0;

        function loader() {

            if(offset > shows.length) {
                page.haveMore(false);
                return;
            }

            for(var i = 0; i < 20; i++) {
                page.appendItem(plugin.id + ':show:' + encodeURIComponent(shows[offset+i].title) + ':' + encodeURIComponent(shows[offset+i].icon) + ':' + shows[offset+i].id  , 'video', shows[offset+i]);
            }
            offset += 20;
            page.haveMore(true);

        }

    }

    page.type = "directory";
    page.asyncPaginator = loader;
    loader();

    page.loading = false;

});


/*
 *  Movies
 */
new page.Route(plugin.id + ":movies", function(page) {

    setPageHeader(page, "Movies");
    page.type = "directory";
    page.loading = true;

    var ororo = new OroroApi({username : decodeURIComponent(credentials.username),password: decodeURIComponent(credentials.password)} , { debug: DEBUG } );
    var movies = ororo.movies();

    if(movies) {

        setPageHeader(page,"Movies" + ' ('+ movies.length.toString()+ ' results)');
        var offset = 0;

        function loader() {

            if(offset > movies.length) {
                page.haveMore(false);
                return;
            }

            for(var i = 0; i < 20; i++) {
                page.appendItem(plugin.id + ':play:movie:'+ movies[offset+i].id  , 'video', movies[offset+i]);
            }
            offset += 20;
            page.haveMore(true);

        }

    }

    page.type = "directory";
    page.asyncPaginator = loader;
    loader();

    page.loading = false;

});


/*
 *  First page
 *  It shows the menu
 */
new page.Route(plugin.id + ":start", function(page) {

    setPageHeader(page, 'Ororo.tv');
    page.loading = true;

    var ororo = new OroroApi({username : decodeURIComponent(credentials.username),password: decodeURIComponent(credentials.password)} , { debug: DEBUG } );

    var ororo_login = ororo.login();
    if(ororo_login.logged_in){

        page.type = "directory";
        page.model.contents= 'grid';



        if(ororo_login.info=="Not logged in") {
              ororo_login.info += ",  use login button on right menu.\n";
              page.model.contents= 'list';
              page.appendItem(plugin.id + ':start' , 'directory', {title:'reload', icon: Plugin.path+ "images/reload.png"} );
        }
        else {

            page.appendItem(plugin.id + ":search:all:", 'search', {
                title: "Search..."
            });

            page.appendPassiveItem('separator','',{title: ''});
            page.appendItem(plugin.id + ':movies' , 'directory', {title:'Movies', icon: Plugin.path+ "images/vod.png"} );
            page.appendItem(plugin.id + ':shows' , 'directory', {title: 'Series', icon: Plugin.path+ "images/series.png"} );
        }
        page.appendPassiveItem('separator','',{title: ororo_login.info ?  ororo_login.info : 'Payed account'});


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
