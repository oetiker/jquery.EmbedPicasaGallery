/**************************************************************************
 * Name:   EmbedPicasaGallery
 * Author: Tobias Oetiker <tobi@oetiker.ch>
 * Demo:   http://tobi.oetiker.ch/photo/
 * $Id$
 **************************************************************************
 Description:
 
 This little script asks picasa web for a list of albums and for a list
 of pictures in the album. It then emits a series of <div class="pic-thumb"/>
 elements containing thumbnail images. The divs are inserted inside the element
 marked with a particular id. Clicking on an album will display thumbnails of the
 images in the album and clicking on a thumbnail will show the image itself
 using slimbox.
 
 The script itself uses jQuery (http://www.jquery.org) and slimbox2
 (http://www.digitalia.be/software/slimbox2) to work. So you have to load
 these two guys before loading the gallery script. You can load them in the
 header or the body of the document, this does not matter.
 
  <script type="text/javascript" src="js/jquery.js"></script>
  <link rel="stylesheet" href="css/slimbox2.css" type="text/css" media="screen" />
  <script type="text/javascript" src="slimbox2.js"></script>
  <script type="text/javascript" src="js/jquery.EmbedPicasaGallery.js"></script>

 Once loaded, call the picasaGallery function. This activates the
 code. With the id argument you tell it, where to put the gallery.

  <script type="text/javascript">
  jQuery(document).ready(function() {
  jQuery("#images").EmbedPicasaGallery('oetiker',{
      matcher:            /./,         // string or regexp to match album title
      size:               '72',        // thumbnail size (32, 48, 64, 72, 144, 160)
      msg_loading_list :  'Loading album list from PicasaWeb',
      msg_back :          'Back',
      authkey :           'optional-picasa-authkey',
      albumid :           'go-directly-to-this-album-ignore-matcher'
      album_title_tag:    '<h2/>'
      thumb_id_prefix:    'pThumb_',
      loading_animation: 'css/loading.gif',
      thumb_finalizer:    function(){var $a = jQuery(this); ... use this to do something to the anchor AFTER slimbox got there },
      thumb_tuner:        function($div,entry,i){ ... $div is the div of the thumbnail, entry is the picasa image info ...}
      link_mapper: function(el){  // see http://code.google.com/p/slimbox/wiki/jQueryAPI#The_linkMapper_function
            return [
                     el.href,
                     '<a href="'+el.href+'">'+el.title+'</a>'
                   ]
            }
   });
  });
  </script>

 Finally inside the document, add a div tag with the id set to the name
 chosen above.
 
 <div id="images"></div>

 To have the elements show up horyzontally stacked and not vertiaclly use css 

**********************************************************************************/

(function($) {
    // setup a namespace for us
    var nsp = 'EmbedPicasaGallery', authkey;

    // Private Variables and Functions in the _ object
    // note that this will refer to _ unless you
    // call using the call or apply methods

    // Public Variables and Methods
    $[nsp] = {
        defaultOptions: {
            matcher : RegExp('.+'),
            size    : 72,
            msg_loading_list : 'Loading album list from PicasaWeb',
            msg_back : 'Back',
            album_title_tag: '<h2/>',
            thumb_id_prefix: 'pThumb_',
            thumb_tuner: null,
            thumb_finalizer: null,
            loading_animation: null,
            link_mapper: function(el){
                    return [
                        el.href,
                        '<a href="'+el.href+'">'+el.title+'</a>'
                    ]
                }
        } 
    };
    $.fn[nsp] = function(user,opts) {
        var localOpts,
            Cache = {};

        localOpts = $.extend( 
            {}, // start with an empty map
            $[nsp].defaultOptions, // add defaults
            opts // add options
        );

        function showOverview() {
            var $this,
                meta_opts,
                albumCount,
                $album_list,
                authkey = '';

            if ( Cache.__overview ){
                 Cache.__overview.show();
                 return;
            }
            $this = $(this);
            $this.empty();
            $this.append($('<br/>').css('clear','left'));
            meta_opts = localOpts;
            if ($.meta){
                meta_opts = $.extend({}, localOpts, $this.data());
            }
            albumCount = 0;
            $album_list = $('<div/>')
                .addClass('album-list')
                .append($('<div/>').text(meta_opts.msg_loading_list));

            $this.prepend($album_list);

            function appendImage(i,item){
                var title,$div,$img;
                title = item.media$group.media$title.$t;
                if (title.match(meta_opts.matcher)){
                    albumCount++;
                    $img = $('<img/>')
                        .attr('title',title)
                        .attr('src',item.media$group.media$thumbnail[0].url)
                    $div = $('<div/>')
                        .addClass('album-cover')
                        .css({
                            'float': 'left',
                            marginRight: '10px',
                            marginBottom: '10px'
                        })
                        .click(function () {
                           $album_list.hide();
                           showAlbum($this,meta_opts,item.gphoto$id.$t,title,item.gphoto$numphotos.$t);
                        })
                        .hover(
                            function () { $(this).css("cursor","pointer")},
                            function () { $(this).css("cursor","default")}
                        )
                        .append( $img )
                        .append(
                            $('<div/>')
                            .addClass('album-title')
                            .css({
                                'font-size': '10px'
                            })
                            .text(title)
                            .width( meta_opts.size )
                        )                    
                    $album_list.append($div);
                };
            }
            
            function renderAlbumList(data){
                var $albums,maxHeight=0;
                $album_list.empty();
        		if (data.feed && data.feed.entry){
    	            $.each(data.feed.entry,appendImage);
        		} else {
          		    $this.text('Warning: No picasa albums found for user ' + user);
		        }
                Cache.__overview = $album_list;
                $albums = $album_list.children();


                if (albumCount == 1){
                    $albums.eq(0).click();
                    return;
                }
                $('.album-title',$album_list)
                .each(function(){                        
                     var h = $(this).outerHeight();
                     if (h > maxHeight){
                        maxHeight = h
                     }
                })
                .each(function(){
                    $(this).height(maxHeight)
                });

            }


            if (meta_opts.authkey){
                authkey = '&authkey=' + meta_opts.authkey;
            }
 
    	    if (meta_opts.albumid) {
       	       showAlbum($this,meta_opts,meta_opts.albumid,'')
    	    }
	        else {
                $.getJSON('http://picasaweb.google.com/data/feed/api/user/' 
                    + user + '?kind=album&access=visible' + authkey 
                    + '&alt=json-in-script&thumbsize=' + meta_opts.size + 'c&callback=?',
                    renderAlbumList
               );
	        }
        };

        function showAlbum($this,meta_opts,album,title,photoCount){                        
            if ( Cache[album] ){
               Cache[album].show();
               return;
            };
            var i,$album,albumPics=[],$albumDiv;

            $album = $('<div/>').addClass('album');

            if (title){
                $album.append($(meta_opts.album_title_tag).text(title))
            }

            function makeDiv(){
               $div = $('<div/>')
                   .width(meta_opts.size)
                   .height(meta_opts.size)
                   .css({
                        'float': 'left',
                        marginRight: '10px',
                        marginBottom: '10px'
                    });
               if (meta_opts.loading_animation){
                   $div.css('background','url(' + meta_opts.loading_animation + ') no-repeat center center');            
               }
               return $div;
            }

            if (Cache.__overview){
                $album.append($("<div/>")
                    .addClass("pic-thumb")
                    .width(meta_opts.size)
                    .height(meta_opts.size)
                    .css({'border-width': '0px',
                         'float' : 'left',
                         marginRight: '10px',
                         marginBottom: '10px'
                     })
                    .append($("<div/>")
                        .html('<br/>'+meta_opts.msg_back)
                        .click(function(){$album.hide();showOverview()})
                        .css({'border-style':'outset',
                              'border-width':'1px',
                              'text-align'  :'center',
                              'width'       : (meta_opts.size - 2) + 'px',
                              'height'      : (meta_opts.size - 2) + 'px'
                        })
                    )
                 );
             }
            
            if (photoCount){
                for (i=0;i<photoCount;i++) {
                    $albumDiv = makeDiv();
                    $album.append($albumDiv);
                    albumPics.push($albumDiv);
                }
            }

            function appendImage(i,item){
               var title, $img, $div, $a;
               title = item.media$group.media$title.$t;
               $img = $(new Image());
               $img.load(function(){                   
                    if (meta_opts.thumb_tuner){
                        meta_opts.thumb_tuner($div,item);
                    }
                    $img.show();
               })
               .css('border-width','0px')
               .hide();
               $a = $("<a/>")
                   .attr("href",item.content.src)
                   .attr("title",title)
                   .append($img);

               if (($div = albumPics[i]) == undefined){
                    $div = makeDiv();  
                    $album.append($div);
               }

               $div
                   .attr("id", meta_opts.thumb_id_prefix + item.gphoto$id.$t )
                   .append($a)
               $img.attr("src", item.media$group.media$thumbnail[0].url);                
            }

            function renderAlbum(data){
                $.each(data.feed.entry,appendImage);

                if ($.fn.slimbox){
                    $('a',$album).slimbox({},meta_opts.link_mapper);
                }
                if (meta_opts.thumb_callback){
                    $('a',$album).each(meta_opts.thumb_callback);
                }
                Cache[album] = $album;
            }
            authkey = '';
            if (meta_opts.authkey){
               authkey = '&authkey=' + meta_opts.authkey;
            }
            $.getJSON('http://picasaweb.google.com/data/feed/api/user/' 
                + user + '/albumid/' 
                + album + '?kind=photo&access=visible' + authkey + '&alt=json-in-script&thumbsize='+meta_opts.size+'c&imgmax=800&callback=?',
                renderAlbum
            );
            $this.prepend($album);
        };

        return this.each(showOverview);
    };
})(jQuery);

