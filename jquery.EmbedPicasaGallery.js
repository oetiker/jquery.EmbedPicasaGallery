/**************************************************************************
 * Name:   EmbedPicasaGallery
 * Author: Tobias Oetiker <tobi@oetiker.ch>
 * Demo:   http://tobi.oetiker.ch/photo/
 * $Id$
/**************************************************************************
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
      msg_loading_album : 'Loading album from PicasaWeb',
      msg_back :          'Back',
      authkey :           'optional-picasa-authkey',
      albumid :           'go-directly-to-this-album-ignore-matcher'
      album_title_tag:    '<h2/>'
      thumb_id_prefix:    'pThumb_',
      loading_amimation: 'css/loading.gif',
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
    var nsp = 'EmbedPicasaGallery';

    // Public Variables and Methods
    $[nsp] = {
        defaultOptions: {
            matcher : RegExp('.+'),
            size    : 72,
            msg_loading_list : 'Loading album list from PicasaWeb',
            msg_loading_album : 'Loading album from PicasaWeb',
            msg_back : 'Back',
            album_title_tag: '<h2/>',
            thumb_id_prefix: 'pThumb_',
            thumb_tuner: null,
            thumb_finalizer: null,
            loading_amimation: 'css/loading.gif',
            link_mapper: function(el){
                    return [
                        el.href,
                        '<a href="'+el.href+'">'+el.title+'</a>'
                    ]
                }
        } 
    };

    // Private Variables and Functions in the _ object
    // note that this will refer to _ unless you
    // call using the call or apply methods
    var _ = {
    };

    $.fn[nsp] = function(user,opts) {
        var localOpts = $.extend( 
            {}, // start with an empty map
            $[nsp].defaultOptions, // add defaults
            opts // add options
        );
        var Cache = {};

        function showOverview() {
            if ( Cache.__overview ){
                 Cache.__overview.fadeIn(0.3);
                 return;
            }
            var $this = $(this);
            $this.empty();
            var meta_opts = localOpts;
            if ($.meta){
                meta_opts = $.extend({}, localOpts, $this.data());
            }
            var albumCount = 0;
            var $album_list = $('<div/>')
                .attr('class','album-list')
                .append($('<div/>').text(meta_opts.msg_loading_list));

            $this.append($album_list);

            function appendImage(i,item){
                var title = item.media$group.media$title.$t;
                if (title.match(meta_opts.matcher)){
                    albumCount++;
                    var $div = $('<div/>');
                    $div.hide();
                    var $img = $(new Image());
                    $img.load(function(){
                        $div.show();
                    });
                    $img.attr('src',item.media$group.media$thumbnail[0].url);
                    $album_list.append( $div
                        .attr('class','album-cover')
                        .css({
                            float: 'left',
                            marginRight: '10px',
                            marginBottom: '10px'
                        })
                        .click(function () {
                           $album_list.hide();
                           showAlbum($this,meta_opts,item.gphoto$id.$t,title);
                        })
                        .hover(
                            function () { $(this).css("cursor","pointer")},
                            function () { $(this).css("cursor","default")}
                        )
                        .append( $img )
                        .append(
                            $('<div/>')
                            .css({
                                'font-size': '10px'
                            })
                            .text(title)
                            .width( meta_opts.size )
                        )
                    );
                };
            }
            
            function renderAlbumList(data){
                $album_list.empty();
        		if (data.feed && data.feed.entry){
    	            $.each(data.feed.entry,appendImage);
        		} else {
          		    $this.text('Warning: No picasa albums found for user ' + user);
		        }
                Cache.__overview = $album_list;
                var $albums = $album_list.children();

                $album_list.append($('<br/>').css('clear','left'));

                if (albumCount == 1){
                    $albums.eq(0).click();
                    return;
                }
            }

            var authkey = '';

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

        function showAlbum($this,meta_opts,album,title){            
            if ( Cache[album] ){
               Cache[album].fadeIn(0.3);
               return;
            };
            var $album = $('<div/>').attr('class','album');

            $this.append($album);            

            $album.append($('<div/>').text(meta_opts.msg_loading_album));

            function appendImage(i,item){
               var title = item.media$group.media$title.$t;
               var $img = $(new Image());
               var $div = $('<div/>')
                   .css({
                        background: 'url(' + meta_opts.loading_animation + ') no-repeat center center',
                        width: meta_opts.size+'px',
                        height: meta_opts.size+'px',
                    });
               $img.load(function(){                   
                    if (meta_opts.thumb_tuner){
                        meta_opts.thumb_tuner($div,item);
                    }
                    $img.fadeIn(0.2);
               });
               $img.css('border-width','0px');
               $img.hide();
               var $a = $("<a/>")
                   .attr("href",item.content.src)
                   .attr("title",title)
                   .append($img)

               $album.append(
                   $div
                   .attr("id", meta_opts.thumb_id_prefix + item.gphoto$id.$t )
                   .css({
                        float: 'left',
                        marginRight: '10px',
                        marginBottom: '10px'
                    })
                    .append($a)
               );
               $img.attr("src", item.media$group.media$thumbnail[0].url);
                
            }

            function renderAlbum(data){
                $album.empty();

                $album.append($(meta_opts.album_title_tag).text(title))

                if (Cache.__overview){
                    $album.append($("<div/>")
                       .attr("class","pic-thumb")
                       .css({'border-width': '0px',
                            float : 'left',
                           'margin-right': '10px',
                           'margin-bottom': '10px',
                            width : meta_opts.size + 'px',
                            height : meta_opts.size + 'px' 
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
                $.each(data.feed.entry,appendImage);

                $album.append($('<br/>').css('clear','left'));


                if ($.fn.slimbox){
                    $('a',$album).slimbox({},meta_opts.link_mapper);
                }
                if (meta_opts.thumb_callback){
                    $('a',$album).each(meta_opts.thumb_callback);
                }
                Cache[album] = $album;
           }
           var authkey = '';
           if (meta_opts.authkey){
               authkey = '&authkey=' + meta_opts.authkey;
           }

           $.getJSON('http://picasaweb.google.com/data/feed/api/user/' 
                + user + '/albumid/' 
                + album + '?kind=photo&access=visible' + authkey + '&alt=json-in-script&thumbsize='+meta_opts.size+'c&imgmax=800&callback=?',
                renderAlbum
           );
        };

        return this.each(showOverview);
    };
})(jQuery);

