/*
    Copyright (C) 2019 Luca Cuzzolin aka czz78

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var http = require('movian/http');


var OroroApi=(function() {

    var _PROTOCOL = 'https://';
    var _BASE_URL = 'ororo.tv';
    var _API_PATH = '/api/v2';

    var _OPTIONS = {
                     debug : false,
                   };

    var _CREDENTIALS= { username: false, password:false};


    var _ACCOUNT_INFO= {'payed_account': false };

    /* construct */
    function OroroApi(credentials, options) {

        if (options === Object(options) && Object.prototype.toString.call(options) !== '[object Array]') {
            this.options = function () {
                return  {
                          debug : options.debug ? options.debug : _OPTIONS.debug,
                        };
            }
        }


        if (credentials === Object(credentials) && Object.prototype.toString.call(credentials) !== '[object Array]') {
            this.credentials = function () {
                return  { username : credentials.username ? credentials.username : _CREDENTIALS.username,
                          password : credentials.password ? credentials.password : _CREDENTIALS.password
                        };
            }
        }

    }



    /******* Methods ********/

    /*
     * Private method Debug
     */
    function _debug(e, t) {
        if(this.options().debug) console.log(e, t);
    }


    /*
     * Private request
     */
    function _req(action) {

        var res = false;

        try { // if realm fails

            var v = http.request(_PROTOCOL + _BASE_URL + _API_PATH + "/" + action , {
                                                                                      headers: {
                                                                                                'Accept': 'application/json',
                                                                                                'Content-Type': 'application/json',
                                                                                                'User-Agent': "Movian " + Core.currentVersionString,
                                                                                                'Authorization': 'Basic ' + Duktape.enc('base64', this.credentials().username + ":" + this.credentials().password),
                                                                                     },
                                                                                     debug: this.options().debug,
                                                                                     compression:true,
                                                                                     noFail:true,

                                });

            if(v){
                switch(v.statuscode){
                    case 401:
                        res = {'code': 401, 'string':"Failed to log in"};
                        break;
                    case 402:
                        res = {'code': 402, 'string':v.toString()};
                        break;
                    default:
                        res = {'code': v.statuscode ? v.statuscode : "Unknown", 'string': v.toString()};
                        //res = {'code': 200, 'string': v.toString()};
                        break;
                }
            }


        }
        catch (err) {
            return false;
        }

        return res;
    }


    /*
     *  Private reorder function to match movian array that feed types
     */
    function _reorder(ob, action){
        if(action === undefined) action = 'movies';
        var subs=[];

        for(var i in ob){

            // video
            ob[i].title = ob[i].name ? ob[i].name : 'No Title';
            delete ob[i].name;
            ob[i].backdrop = ob[i].backdrop_url ? ob[i].backdrop_url : '';
            delete ob[i].backdrop_url;

            if(ob[i].desc){
                ob[i].description = ob[i].desc ? ob[i].desc : '';
                delete ob[i].desc;
            }
            ob[i].icon = ob[i].poster_thumb ? ob[i].poster_thumb : '';
            delete ob[i].poster_thumb;
            ob[i].genre = ob[i].array_genres ? ob[i].array_genres.join() : '';
            delete ob[i].array_genres;
            ob[i].duration = ob[i].length ? ob[i].length : '';
            delete ob[i].length;
            ob[i].source = ob[i].id ? _PROTOCOL + _BASE_URL + _API_PATH + "/" +  action+"/" + ob[i].id : '';

            // videoparams
            ob[i].sources = [ { 'url': ob[i].url ?  ob[i].url : ''} ];
            delete ob[i].url;

            ob[i].imdbid = [ { 'url': ob[i].imdb_id ?  ob[i].imdb_id : ''} ];
            delete ob[i].imdb_id;

            if(ob[i].subtitles) {
                for(var k in ob[i].subtitles) {
                    subs.push({'url': ob[i].subtitles[k].url, 'title': ob[i].subtitles[k].lang, 'language': ob[i].subtitles[k].lang});
                }
                ob[i].subtitles= subs;
            }

            // videoparams for series
            if(ob[i].season){

                ob[i].vtype = 'tvseries';

                ob[i].season = {'number': ob[i].season ? parseInt(ob[i].season) : '' };

                if(ob[i].number) {
                    ob[i].episode = {'title': ob[i].title ? ob[i].title : '' , 'number': ob[i].number ?  parseInt(ob[i].number) : '' };
                    delete ob[i].number;
                }

                if(ob[i].plot) {
                    ob[i].description = ob[i].plot ?  ob[i].plot : '';
                    delete ob[i].plot;
                }
            }

        }

        return ob;

    }


    function _sortEpisodes(episodes) {

       episodes.sort(function(a, b) {
            return a.season.number - b.season.number || a.episode.number - b.episode.number;
        });

        return episodes;

    }


    function _sortByTitle(ob) {

       ob.sort(function(a, b){
           if(a.title < b.title) { return -1; }
           if(a.title > b.title) { return 1; }
           return 0;
        });

        return ob;

    }


    /*
     *  Check login return bool
     */
    OroroApi.prototype.login = function () {

        var res = _req.call(this,'movies/25');
        _debug.call(this, JSON.stringify(res), "OroroApi:login")
        if(res) return {'logged_in':true, 'info': res.string }
        return {'logged_in':true, 'info': "Not logged in" };

    };


    /*
     *  Get movies returns json object for movian
     */
    OroroApi.prototype.movies = function () {

        var res = _req.call(this,'movies');
        _debug.call(this, JSON.stringify(res), "OroroApi:movies")

        if(res){

            var r = JSON.parse(res.string);
            r = _reorder.call(this,r.movies);
           _debug.call(this, JSON.stringify(r), "OroroApi:movies.reorder")
            r = _sortByTitle.call(this,r);
            return r;
        }

        return false;

    };


    /*
     *  Get movie returns json object for movian
     */
    OroroApi.prototype.movie = function (movie_id) {

        var res = _req.call(this,'movies' + '/' + movie_id);
        _debug.call(this, JSON.stringify(res), "OroroApi:movie")

        if(res){

            var r = JSON.parse(res.string);
            r = _reorder.call(this,[r])[0];
           _debug.call(this, JSON.stringify(r), "OroroApi:movie.reorder")
            return r;
        }

        return false;

    };


    /*
     *  Get shows returns json object for movian
     */
    OroroApi.prototype.shows = function () {

        var res = _req.call(this,'shows');
        _debug.call(this, JSON.stringify(res), "OroroApi:shows")

        if(res){

            var r = JSON.parse(res.string);
            r = _reorder.call(this,r.shows);
           _debug.call(this, JSON.stringify(r), "OroroApi:shows.reorder")
            r = _sortByTitle.call(this,r);
            return r;
        }

        return false;

    };


    /*
     *  Get episodes returns json object for movian
     */
    OroroApi.prototype.episodes =function (show_id) {

        var res = _req.call(this,'shows' + '/' + show_id);
        _debug.call(this, JSON.stringify(res), "OroroApi:episodes.show")

        if(res){

            var e = JSON.parse(res.string);
            e = _reorder.call(this,e.episodes);
           _debug.call(this, JSON.stringify(e), "OroroApi:episodes.reorder")
            return _sortEpisodes.call(this,e);

        }

        return false;

    };


    /*
     *  Get episode returns json object for movian
     */
    OroroApi.prototype.episode = function (episode_id) {

        var res = _req.call(this,'episodes' + '/' + episode_id);
        _debug.call(this, JSON.stringify(res), "OroroApi:episode")

        if(res){

            var r = JSON.parse(res.string);
            r = _reorder.call(this,[r])[0];
           _debug.call(this, JSON.stringify(r), "OroroApi:episode.reorder")
            return r;
        }

        return false;

    };


    return OroroApi ;

})();


module.exports = OroroApi;
