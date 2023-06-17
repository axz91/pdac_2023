
window.headroom_prevent_pin = false;

window.document.addEventListener("DOMContentLoaded", function (event) {

  // initialize headroom for banner
  var header = $('header').get(0);
  var headerHeight = header.offsetHeight;
  var headroom = new Headroom(header, {
    tolerance: 5,
    onPin : function() {
      if (window.headroom_prevent_pin) {
        window.headroom_prevent_pin = false;
        headroom.unpin();
      }
    }
  });
  headroom.init();
  if(window.location.hash)
    headroom.unpin();
  $(header).addClass('headroom--transition');

  // offset scroll location for banner on hash change
  // (see: https://github.com/WickyNilliams/headroom.js/issues/38)
  window.addEventListener("hashchange", function(event) {
    window.scrollTo(0, window.pageYOffset - (headerHeight + 25));
  });

  // responsive menu
  $('.distill-site-header').each(function(i, val) {
    var topnav = $(this);
    var toggle = topnav.find('.nav-toggle');
    toggle.on('click', function() {
      topnav.toggleClass('responsive');
    });
  });

  // nav dropdowns
  $('.nav-dropbtn').click(function(e) {
    $(this).next('.nav-dropdown-content').toggleClass('nav-dropdown-active');
    $(this).parent().siblings('.nav-dropdown')
       .children('.nav-dropdown-content').removeClass('nav-dropdown-active');
  });
  $("body").click(function(e){
    $('.nav-dropdown-content').removeClass('nav-dropdown-active');
  });
  $(".nav-dropdown").click(function(e){
    e.stopPropagation();
  });
});


function getMeta(metaName) {
    var metas = document.getElementsByTagName('meta');
    for (let i = 0; i < metas.length; i++) {
      if (metas[i].getAttribute('name') === metaName) {
        return metas[i].getAttribute('content');
      }
    }
    return '';
  }

  function offsetURL(url) {
    var offset = getMeta('distill:offset');
    return offset ? offset + '/' + url : url;
  }

  function createFuseIndex() {

    // create fuse index
    var options = {
      keys: [
        { name: 'title', weight: 20 },
        { name: 'categories', weight: 15 },
        { name: 'description', weight: 10 },
        { name: 'contents', weight: 5 },
      ],
      ignoreLocation: true,
      threshold: 0
    };
    var fuse = new window.Fuse([], options);

    // fetch the main search.json
    return fetch(offsetURL('search.json'))
      .then(function(response) {
        if (response.status == 200) {
          return response.json().then(function(json) {
            // index main articles
            json.articles.forEach(function(article) {
              fuse.add(article);
            });
            // download collections and index their articles
            return Promise.all(json.collections.map(function(collection) {
              return fetch(offsetURL(collection)).then(function(response) {
                if (response.status === 200) {
                  return response.json().then(function(articles) {
                    articles.forEach(function(article) {
                      fuse.add(article);
                    });
                  })
                } else {
                  return Promise.reject(
                    new Error('Unexpected status from search index request: ' +
                              response.status)
                  );
                }
              });
            })).then(function() {
              return fuse;
            });
          });

        } else {
          return Promise.reject(
            new Error('Unexpected status from search index request: ' +
                        response.status)
          );
        }
      });
  }

  window.document.addEventListener("DOMContentLoaded", function (event) {

    // get search element (bail if we don't have one)
    var searchEl = window.document.getElementById('distill-search');
    if (!searchEl)
      return;

    createFuseIndex()
      .then(function(fuse) {

        // make search box visible
        searchEl.classList.remove('hidden');

        // initialize autocomplete
        var options = {
          autoselect: true,
          hint: false,
          minLength: 2,
        };
        window.autocomplete(searchEl, options, [{
          source: function(query, callback) {
            const searchOptions = {
              isCaseSensitive: false,
              shouldSort: true,
              minMatchCharLength: 2,
              limit: 10,
            };
            var results = fuse.search(query, searchOptions);
            callback(results
              .map(function(result) { return result.item; })
            );
          },
          templates: {
            suggestion: function(suggestion) {
              var img = suggestion.preview && Object.keys(suggestion.preview).length > 0
                ? `<img src="${offsetURL(suggestion.preview)}"</img>`
                : '';
              var html = `
                <div class="search-item">
                  <h3>${suggestion.title}</h3>
                  <div class="search-item-description">
                    ${suggestion.description || ''}
                  </div>
                  <div class="search-item-preview">
                    ${img}
                  </div>
                </div>
              `;
              return html;
            }
          }
        }]).on('autocomplete:selected', function(event, suggestion) {
          window.location.href = offsetURL(suggestion.path);
        });
        // remove inline display style on autocompleter (we want to
        // manage responsive display via css)
        $('.algolia-autocomplete').css("display", "");
      })
      .catch(function(error) {
        console.log(error);
      });

  });


  function is_downlevel_browser() {
    if (bowser.isUnsupportedBrowser({ msie: "12", msedge: "16"},
                                   window.navigator.userAgent)) {
      return true;
    } else {
      return window.load_distill_framework === undefined;
    }
  }

  // show body when load is complete
  function on_load_complete() {

    // add anchors
    if (window.anchors) {
      window.anchors.options.placement = 'left';
      window.anchors.add('d-article > h2, d-article > h3, d-article > h4, d-article > h5');
    }


    // set body to visible
    document.body.style.visibility = 'visible';

    // force redraw for leaflet widgets
    if (window.HTMLWidgets) {
      var maps = window.HTMLWidgets.findAll(".leaflet");
      $.each(maps, function(i, el) {
        var map = this.getMap();
        map.invalidateSize();
        map.eachLayer(function(layer) {
          if (layer instanceof L.TileLayer)
            layer.redraw();
        });
      });
    }

    // trigger 'shown' so htmlwidgets resize
    $('d-article').trigger('shown');
  }

  function init_distill() {

    init_common();

    // create front matter
    var front_matter = $('<d-front-matter></d-front-matter>');
    $('#distill-front-matter').wrap(front_matter);

    // create d-title
    $('.d-title').changeElementType('d-title');

    // create d-byline
    var byline = $('<d-byline></d-byline>');
    $('.d-byline').replaceWith(byline);

    // create d-article
    var article = $('<d-article></d-article>');
    $('.d-article').wrap(article).children().unwrap();

    // move posts container into article
    $('.posts-container').appendTo($('d-article'));

    // create d-appendix
    $('.d-appendix').changeElementType('d-appendix');

    // flag indicating that we have appendix items
    var appendix = $('.appendix-bottom').children('h3').length > 0;

    // replace footnotes with <d-footnote>
    $('.footnote-ref').each(function(i, val) {
      appendix = true;
      var href = $(this).attr('href');
      var id = href.replace('#', '');
      var fn = $('#' + id);
      var fn_p = $('#' + id + '>p');
      fn_p.find('.footnote-back').remove();
      var text = fn_p.html();
      var dtfn = $('<d-footnote></d-footnote>');
      dtfn.html(text);
      $(this).replaceWith(dtfn);
    });
    // remove footnotes
    $('.footnotes').remove();

    // move refs into #references-listing
    $('#references-listing').replaceWith($('#refs'));

    $('h1.appendix, h2.appendix').each(function(i, val) {
      $(this).changeElementType('h3');
    });
    $('h3.appendix').each(function(i, val) {
      var id = $(this).attr('id');
      $('.d-contents a[href="#' + id + '"]').parent().remove();
      appendix = true;
      $(this).nextUntil($('h1, h2, h3')).addBack().appendTo($('d-appendix'));
    });

    // show d-appendix if we have appendix content
    $("d-appendix").css('display', appendix ? 'grid' : 'none');

    // localize layout chunks to just output
    $('.layout-chunk').each(function(i, val) {

      // capture layout
      var layout = $(this).attr('data-layout');

      // apply layout to markdown level block elements
      var elements = $(this).children().not('details, div.sourceCode, pre, script');
      elements.each(function(i, el) {
        var layout_div = $('<div class="' + layout + '"></div>');
        if (layout_div.hasClass('shaded')) {
          var shaded_content = $('<div class="shaded-content"></div>');
          $(this).wrap(shaded_content);
          $(this).parent().wrap(layout_div);
        } else {
          $(this).wrap(layout_div);
        }
      });


      // unwrap the layout-chunk div
      $(this).children().unwrap();
    });

    // remove code block used to force  highlighting css
    $('.distill-force-highlighting-css').parent().remove();

    // remove empty line numbers inserted by pandoc when using a
    // custom syntax highlighting theme
    $('code.sourceCode a:empty').remove();

    // load distill framework
    load_distill_framework();

    // wait for window.distillRunlevel == 4 to do post processing
    function distill_post_process() {

      if (!window.distillRunlevel || window.distillRunlevel < 4)
        return;

      // hide author/affiliations entirely if we have no authors
      var front_matter = JSON.parse($("#distill-front-matter").html());
      var have_authors = front_matter.authors && front_matter.authors.length > 0;
      if (!have_authors)
        $('d-byline').addClass('hidden');

      // article with toc class
      $('.d-contents').parent().addClass('d-article-with-toc');

      // strip links that point to #
      $('.authors-affiliations').find('a[href="#"]').removeAttr('href');

      // add orcid ids
      $('.authors-affiliations').find('.author').each(function(i, el) {
        var orcid_id = front_matter.authors[i].orcidID;
        if (orcid_id) {
          var a = $('<a></a>');
          a.attr('href', 'https://orcid.org/' + orcid_id);
          var img = $('<img></img>');
          img.addClass('orcid-id');
          img.attr('alt', 'ORCID ID');
          img.attr('src','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo1N0NEMjA4MDI1MjA2ODExOTk0QzkzNTEzRjZEQTg1NyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDozM0NDOEJGNEZGNTcxMUUxODdBOEVCODg2RjdCQ0QwOSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDozM0NDOEJGM0ZGNTcxMUUxODdBOEVCODg2RjdCQ0QwOSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IE1hY2ludG9zaCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkZDN0YxMTc0MDcyMDY4MTE5NUZFRDc5MUM2MUUwNEREIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjU3Q0QyMDgwMjUyMDY4MTE5OTRDOTM1MTNGNkRBODU3Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+84NovQAAAR1JREFUeNpiZEADy85ZJgCpeCB2QJM6AMQLo4yOL0AWZETSqACk1gOxAQN+cAGIA4EGPQBxmJA0nwdpjjQ8xqArmczw5tMHXAaALDgP1QMxAGqzAAPxQACqh4ER6uf5MBlkm0X4EGayMfMw/Pr7Bd2gRBZogMFBrv01hisv5jLsv9nLAPIOMnjy8RDDyYctyAbFM2EJbRQw+aAWw/LzVgx7b+cwCHKqMhjJFCBLOzAR6+lXX84xnHjYyqAo5IUizkRCwIENQQckGSDGY4TVgAPEaraQr2a4/24bSuoExcJCfAEJihXkWDj3ZAKy9EJGaEo8T0QSxkjSwORsCAuDQCD+QILmD1A9kECEZgxDaEZhICIzGcIyEyOl2RkgwAAhkmC+eAm0TAAAAABJRU5ErkJggg==');
          a.append(img);
          $(this).append(a);
        }
      });

      // hide elements of author/affiliations grid that have no value
      function hide_byline_column(caption) {
        $('d-byline').find('h3:contains("' + caption + '")').parent().css('visibility', 'hidden');
      }

      // affiliations
      var have_affiliations = false;
      for (var i = 0; i<front_matter.authors.length; ++i) {
        var author = front_matter.authors[i];
        if (author.affiliation !== "&nbsp;") {
          have_affiliations = true;
          break;
        }
      }
      if (!have_affiliations)
        $('d-byline').find('h3:contains("Affiliations")').css('visibility', 'hidden');

      // published date
      if (!front_matter.publishedDate)
        hide_byline_column("Published");

      // document object identifier
      var doi = $('d-byline').find('h3:contains("DOI")');
      var doi_p = doi.next().empty();
      if (!front_matter.doi) {
        // if we have a citation and valid citationText then link to that
        if ($('#citation').length > 0 && front_matter.citationText) {
          doi.html('Citation');
          $('<a href="#citation"></a>')
            .text(front_matter.citationText)
            .appendTo(doi_p);
        } else {
          hide_byline_column("DOI");
        }
      } else {
        $('<a></a>')
           .attr('href', "https://doi.org/" + front_matter.doi)
           .html(front_matter.doi)
           .appendTo(doi_p);
      }

       // change plural form of authors/affiliations
      if (front_matter.authors.length === 1) {
        var grid = $('.authors-affiliations');
        grid.children('h3:contains("Authors")').text('Author');
        grid.children('h3:contains("Affiliations")').text('Affiliation');
      }

      // remove d-appendix and d-footnote-list local styles
      $('d-appendix > style:first-child').remove();
      $('d-footnote-list > style:first-child').remove();

      // move appendix-bottom entries to the bottom
      $('.appendix-bottom').appendTo('d-appendix').children().unwrap();
      $('.appendix-bottom').remove();

      // hoverable references
      $('span.citation[data-cites]').each(function() {
        var refs = $(this).attr('data-cites').split(" ");
        var refHtml = refs.map(function(ref) {
          return "<p>" + $('#ref-' + ref).html() + "</p>";
        }).join("\n");
        window.tippy(this, {
          allowHTML: true,
          content: refHtml,
          maxWidth: 500,
          interactive: true,
          interactiveBorder: 10,
          theme: 'light-border',
          placement: 'bottom-start'
        });
      });

      // clear polling timer
      clearInterval(tid);

      // show body now that everything is ready
      on_load_complete();
    }

    var tid = setInterval(distill_post_process, 50);
    distill_post_process();

  }

  function init_downlevel() {

    init_common();

     // insert hr after d-title
    $('.d-title').after($('<hr class="section-separator"/>'));

    // check if we have authors
    var front_matter = JSON.parse($("#distill-front-matter").html());
    var have_authors = front_matter.authors && front_matter.authors.length > 0;

    // manage byline/border
    if (!have_authors)
      $('.d-byline').remove();
    $('.d-byline').after($('<hr class="section-separator"/>'));
    $('.d-byline a').remove();

    // remove toc
    $('.d-contents').remove();

    // move appendix elements
    $('h1.appendix, h2.appendix').each(function(i, val) {
      $(this).changeElementType('h3');
    });
    $('h3.appendix').each(function(i, val) {
      $(this).nextUntil($('h1, h2, h3')).addBack().appendTo($('.d-appendix'));
    });


    // inject headers into references and footnotes
    var refs_header = $('<h3></h3>');
    refs_header.text('References');
    $('#refs').prepend(refs_header);

    var footnotes_header = $('<h3></h3');
    footnotes_header.text('Footnotes');
    $('.footnotes').children('hr').first().replaceWith(footnotes_header);

    // move appendix-bottom entries to the bottom
    $('.appendix-bottom').appendTo('.d-appendix').children().unwrap();
    $('.appendix-bottom').remove();

    // remove appendix if it's empty
    if ($('.d-appendix').children().length === 0)
      $('.d-appendix').remove();

    // prepend separator above appendix
    $('.d-appendix').before($('<hr class="section-separator" style="clear: both"/>'));

    // trim code
    $('pre>code').each(function(i, val) {
      $(this).html($.trim($(this).html()));
    });

    // move posts-container right before article
    $('.posts-container').insertBefore($('.d-article'));

    $('body').addClass('downlevel');

    on_load_complete();
  }


  function init_common() {

    // jquery plugin to change element types
    (function($) {
      $.fn.changeElementType = function(newType) {
        var attrs = {};

        $.each(this[0].attributes, function(idx, attr) {
          attrs[attr.nodeName] = attr.nodeValue;
        });

        this.replaceWith(function() {
          return $("<" + newType + "/>", attrs).append($(this).contents());
        });
      };
    })(jQuery);

    // prevent underline for linked images
    $('a > img').parent().css({'border-bottom' : 'none'});

    // mark non-body figures created by knitr chunks as 100% width
    $('.layout-chunk').each(function(i, val) {
      var figures = $(this).find('img, .html-widget');
      if ($(this).attr('data-layout') !== "l-body") {
        figures.css('width', '100%');
      } else {
        figures.css('max-width', '100%');
        figures.filter("[width]").each(function(i, val) {
          var fig = $(this);
          fig.css('width', fig.attr('width') + 'px');
        });

      }
    });

    // auto-append index.html to post-preview links in file: protocol
    // and in rstudio ide preview
    $('.post-preview').each(function(i, val) {
      if (window.location.protocol === "file:")
        $(this).attr('href', $(this).attr('href') + "index.html");
    });

    // get rid of index.html references in header
    if (window.location.protocol !== "file:") {
      $('.distill-site-header a[href]').each(function(i,val) {
        $(this).attr('href', $(this).attr('href').replace("index.html", "./"));
      });
    }

    // add class to pandoc style tables
    $('tr.header').parent('thead').parent('table').addClass('pandoc-table');
    $('.kable-table').children('table').addClass('pandoc-table');

    // add figcaption style to table captions
    $('caption').parent('table').addClass("figcaption");

    // initialize posts list
    if (window.init_posts_list)
      window.init_posts_list();

    // implmement disqus comment link
    $('.disqus-comment-count').click(function() {
      window.headroom_prevent_pin = true;
      $('#disqus_thread').toggleClass('hidden');
      if (!$('#disqus_thread').hasClass('hidden')) {
        var offset = $(this).offset();
        $(window).resize();
        $('html, body').animate({
          scrollTop: offset.top - 35
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    if (is_downlevel_browser())
      init_downlevel();
    else
      window.addEventListener('WebComponentsReady', init_distill);
  });


  (function() {
    // If window.HTMLWidgets is already defined, then use it; otherwise create a
    // new object. This allows preceding code to set options that affect the
    // initialization process (though none currently exist).
    window.HTMLWidgets = window.HTMLWidgets || {};
  
    // See if we're running in a viewer pane. If not, we're in a web browser.
    var viewerMode = window.HTMLWidgets.viewerMode =
        /\bviewer_pane=1\b/.test(window.location);
  
    // See if we're running in Shiny mode. If not, it's a static document.
    // Note that static widgets can appear in both Shiny and static modes, but
    // obviously, Shiny widgets can only appear in Shiny apps/documents.
    var shinyMode = window.HTMLWidgets.shinyMode =
        typeof(window.Shiny) !== "undefined" && !!window.Shiny.outputBindings;
  
    // We can't count on jQuery being available, so we implement our own
    // version if necessary.
    function querySelectorAll(scope, selector) {
      if (typeof(jQuery) !== "undefined" && scope instanceof jQuery) {
        return scope.find(selector);
      }
      if (scope.querySelectorAll) {
        return scope.querySelectorAll(selector);
      }
    }
  
    function asArray(value) {
      if (value === null)
        return [];
      if ($.isArray(value))
        return value;
      return [value];
    }
  
    // Implement jQuery's extend
    function extend(target /*, ... */) {
      if (arguments.length == 1) {
        return target;
      }
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var prop in source) {
          if (source.hasOwnProperty(prop)) {
            target[prop] = source[prop];
          }
        }
      }
      return target;
    }
  
    // IE8 doesn't support Array.forEach.
    function forEach(values, callback, thisArg) {
      if (values.forEach) {
        values.forEach(callback, thisArg);
      } else {
        for (var i = 0; i < values.length; i++) {
          callback.call(thisArg, values[i], i, values);
        }
      }
    }
  
    // Replaces the specified method with the return value of funcSource.
    //
    // Note that funcSource should not BE the new method, it should be a function
    // that RETURNS the new method. funcSource receives a single argument that is
    // the overridden method, it can be called from the new method. The overridden
    // method can be called like a regular function, it has the target permanently
    // bound to it so "this" will work correctly.
    function overrideMethod(target, methodName, funcSource) {
      var superFunc = target[methodName] || function() {};
      var superFuncBound = function() {
        return superFunc.apply(target, arguments);
      };
      target[methodName] = funcSource(superFuncBound);
    }
  
    // Add a method to delegator that, when invoked, calls
    // delegatee.methodName. If there is no such method on
    // the delegatee, but there was one on delegator before
    // delegateMethod was called, then the original version
    // is invoked instead.
    // For example:
    //
    // var a = {
    //   method1: function() { console.log('a1'); }
    //   method2: function() { console.log('a2'); }
    // };
    // var b = {
    //   method1: function() { console.log('b1'); }
    // };
    // delegateMethod(a, b, "method1");
    // delegateMethod(a, b, "method2");
    // a.method1();
    // a.method2();
    //
    // The output would be "b1", "a2".
    function delegateMethod(delegator, delegatee, methodName) {
      var inherited = delegator[methodName];
      delegator[methodName] = function() {
        var target = delegatee;
        var method = delegatee[methodName];
  
        // The method doesn't exist on the delegatee. Instead,
        // call the method on the delegator, if it exists.
        if (!method) {
          target = delegator;
          method = inherited;
        }
  
        if (method) {
          return method.apply(target, arguments);
        }
      };
    }
  
    // Implement a vague facsimilie of jQuery's data method
    function elementData(el, name, value) {
      if (arguments.length == 2) {
        return el["htmlwidget_data_" + name];
      } else if (arguments.length == 3) {
        el["htmlwidget_data_" + name] = value;
        return el;
      } else {
        throw new Error("Wrong number of arguments for elementData: " +
          arguments.length);
      }
    }
  
    // http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
    function escapeRegExp(str) {
      return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }
  
    function hasClass(el, className) {
      var re = new RegExp("\\b" + escapeRegExp(className) + "\\b");
      return re.test(el.className);
    }
  
    // elements - array (or array-like object) of HTML elements
    // className - class name to test for
    // include - if true, only return elements with given className;
    //   if false, only return elements *without* given className
    function filterByClass(elements, className, include) {
      var results = [];
      for (var i = 0; i < elements.length; i++) {
        if (hasClass(elements[i], className) == include)
          results.push(elements[i]);
      }
      return results;
    }
  
    function on(obj, eventName, func) {
      if (obj.addEventListener) {
        obj.addEventListener(eventName, func, false);
      } else if (obj.attachEvent) {
        obj.attachEvent(eventName, func);
      }
    }
  
    function off(obj, eventName, func) {
      if (obj.removeEventListener)
        obj.removeEventListener(eventName, func, false);
      else if (obj.detachEvent) {
        obj.detachEvent(eventName, func);
      }
    }
  
    // Translate array of values to top/right/bottom/left, as usual with
    // the "padding" CSS property
    // https://developer.mozilla.org/en-US/docs/Web/CSS/padding
    function unpackPadding(value) {
      if (typeof(value) === "number")
        value = [value];
      if (value.length === 1) {
        return {top: value[0], right: value[0], bottom: value[0], left: value[0]};
      }
      if (value.length === 2) {
        return {top: value[0], right: value[1], bottom: value[0], left: value[1]};
      }
      if (value.length === 3) {
        return {top: value[0], right: value[1], bottom: value[2], left: value[1]};
      }
      if (value.length === 4) {
        return {top: value[0], right: value[1], bottom: value[2], left: value[3]};
      }
    }
  
    // Convert an unpacked padding object to a CSS value
    function paddingToCss(paddingObj) {
      return paddingObj.top + "px " + paddingObj.right + "px " + paddingObj.bottom + "px " + paddingObj.left + "px";
    }
  
    // Makes a number suitable for CSS
    function px(x) {
      if (typeof(x) === "number")
        return x + "px";
      else
        return x;
    }
  
    // Retrieves runtime widget sizing information for an element.
    // The return value is either null, or an object with fill, padding,
    // defaultWidth, defaultHeight fields.
    function sizingPolicy(el) {
      var sizingEl = document.querySelector("script[data-for='" + el.id + "'][type='application/htmlwidget-sizing']");
      if (!sizingEl)
        return null;
      var sp = JSON.parse(sizingEl.textContent || sizingEl.text || "{}");
      if (viewerMode) {
        return sp.viewer;
      } else {
        return sp.browser;
      }
    }
  
    // @param tasks Array of strings (or falsy value, in which case no-op).
    //   Each element must be a valid JavaScript expression that yields a
    //   function. Or, can be an array of objects with "code" and "data"
    //   properties; in this case, the "code" property should be a string
    //   of JS that's an expr that yields a function, and "data" should be
    //   an object that will be added as an additional argument when that
    //   function is called.
    // @param target The object that will be "this" for each function
    //   execution.
    // @param args Array of arguments to be passed to the functions. (The
    //   same arguments will be passed to all functions.)
    function evalAndRun(tasks, target, args) {
      if (tasks) {
        forEach(tasks, function(task) {
          var theseArgs = args;
          if (typeof(task) === "object") {
            theseArgs = theseArgs.concat([task.data]);
            task = task.code;
          }
          var taskFunc = tryEval(task);
          if (typeof(taskFunc) !== "function") {
            throw new Error("Task must be a function! Source:\n" + task);
          }
          taskFunc.apply(target, theseArgs);
        });
      }
    }
  
    // Attempt eval() both with and without enclosing in parentheses.
    // Note that enclosing coerces a function declaration into
    // an expression that eval() can parse
    // (otherwise, a SyntaxError is thrown)
    function tryEval(code) {
      var result = null;
      try {
        result = eval("(" + code + ")");
      } catch(error) {
        if (!(error instanceof SyntaxError)) {
          throw error;
        }
        try {
          result = eval(code);
        } catch(e) {
          if (e instanceof SyntaxError) {
            throw error;
          } else {
            throw e;
          }
        }
      }
      return result;
    }
  
    function initSizing(el) {
      var sizing = sizingPolicy(el);
      if (!sizing)
        return;
  
      var cel = document.getElementById("htmlwidget_container");
      if (!cel)
        return;
  
      if (typeof(sizing.padding) !== "undefined") {
        document.body.style.margin = "0";
        document.body.style.padding = paddingToCss(unpackPadding(sizing.padding));
      }
  
      if (sizing.fill) {
        document.body.style.overflow = "hidden";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
        document.documentElement.style.width = "100%";
        document.documentElement.style.height = "100%";
        if (cel) {
          cel.style.position = "absolute";
          var pad = unpackPadding(sizing.padding);
          cel.style.top = pad.top + "px";
          cel.style.right = pad.right + "px";
          cel.style.bottom = pad.bottom + "px";
          cel.style.left = pad.left + "px";
          el.style.width = "100%";
          el.style.height = "100%";
        }
  
        return {
          getWidth: function() { return cel.offsetWidth; },
          getHeight: function() { return cel.offsetHeight; }
        };
  
      } else {
        el.style.width = px(sizing.width);
        el.style.height = px(sizing.height);
  
        return {
          getWidth: function() { return el.offsetWidth; },
          getHeight: function() { return el.offsetHeight; }
        };
      }
    }
  
    // Default implementations for methods
    var defaults = {
      find: function(scope) {
        return querySelectorAll(scope, "." + this.name);
      },
      renderError: function(el, err) {
        var $el = $(el);
  
        this.clearError(el);
  
        // Add all these error classes, as Shiny does
        var errClass = "shiny-output-error";
        if (err.type !== null) {
          // use the classes of the error condition as CSS class names
          errClass = errClass + " " + $.map(asArray(err.type), function(type) {
            return errClass + "-" + type;
          }).join(" ");
        }
        errClass = errClass + " htmlwidgets-error";
  
        // Is el inline or block? If inline or inline-block, just display:none it
        // and add an inline error.
        var display = $el.css("display");
        $el.data("restore-display-mode", display);
  
        if (display === "inline" || display === "inline-block") {
          $el.hide();
          if (err.message !== "") {
            var errorSpan = $("<span>").addClass(errClass);
            errorSpan.text(err.message);
            $el.after(errorSpan);
          }
        } else if (display === "block") {
          // If block, add an error just after the el, set visibility:none on the
          // el, and position the error to be on top of the el.
          // Mark it with a unique ID and CSS class so we can remove it later.
          $el.css("visibility", "hidden");
          if (err.message !== "") {
            var errorDiv = $("<div>").addClass(errClass).css("position", "absolute")
              .css("top", el.offsetTop)
              .css("left", el.offsetLeft)
              // setting width can push out the page size, forcing otherwise
              // unnecessary scrollbars to appear and making it impossible for
              // the element to shrink; so use max-width instead
              .css("maxWidth", el.offsetWidth)
              .css("height", el.offsetHeight);
            errorDiv.text(err.message);
            $el.after(errorDiv);
  
            // Really dumb way to keep the size/position of the error in sync with
            // the parent element as the window is resized or whatever.
            var intId = setInterval(function() {
              if (!errorDiv[0].parentElement) {
                clearInterval(intId);
                return;
              }
              errorDiv
                .css("top", el.offsetTop)
                .css("left", el.offsetLeft)
                .css("maxWidth", el.offsetWidth)
                .css("height", el.offsetHeight);
            }, 500);
          }
        }
      },
      clearError: function(el) {
        var $el = $(el);
        var display = $el.data("restore-display-mode");
        $el.data("restore-display-mode", null);
  
        if (display === "inline" || display === "inline-block") {
          if (display)
            $el.css("display", display);
          $(el.nextSibling).filter(".htmlwidgets-error").remove();
        } else if (display === "block"){
          $el.css("visibility", "inherit");
          $(el.nextSibling).filter(".htmlwidgets-error").remove();
        }
      },
      sizing: {}
    };
  
    // Called by widget bindings to register a new type of widget. The definition
    // object can contain the following properties:
    // - name (required) - A string indicating the binding name, which will be
    //   used by default as the CSS classname to look for.
    // - initialize (optional) - A function(el) that will be called once per
    //   widget element; if a value is returned, it will be passed as the third
    //   value to renderValue.
    // - renderValue (required) - A function(el, data, initValue) that will be
    //   called with data. Static contexts will cause this to be called once per
    //   element; Shiny apps will cause this to be called multiple times per
    //   element, as the data changes.
    window.HTMLWidgets.widget = function(definition) {
      if (!definition.name) {
        throw new Error("Widget must have a name");
      }
      if (!definition.type) {
        throw new Error("Widget must have a type");
      }
      // Currently we only support output widgets
      if (definition.type !== "output") {
        throw new Error("Unrecognized widget type '" + definition.type + "'");
      }
      // TODO: Verify that .name is a valid CSS classname
  
      // Support new-style instance-bound definitions. Old-style class-bound
      // definitions have one widget "object" per widget per type/class of
      // widget; the renderValue and resize methods on such widget objects
      // take el and instance arguments, because the widget object can't
      // store them. New-style instance-bound definitions have one widget
      // object per widget instance; the definition that's passed in doesn't
      // provide renderValue or resize methods at all, just the single method
      //   factory(el, width, height)
      // which returns an object that has renderValue(x) and resize(w, h).
      // This enables a far more natural programming style for the widget
      // author, who can store per-instance state using either OO-style
      // instance fields or functional-style closure variables (I guess this
      // is in contrast to what can only be called C-style pseudo-OO which is
      // what we required before).
      if (definition.factory) {
        definition = createLegacyDefinitionAdapter(definition);
      }
  
      if (!definition.renderValue) {
        throw new Error("Widget must have a renderValue function");
      }
  
      // For static rendering (non-Shiny), use a simple widget registration
      // scheme. We also use this scheme for Shiny apps/documents that also
      // contain static widgets.
      window.HTMLWidgets.widgets = window.HTMLWidgets.widgets || [];
      // Merge defaults into the definition; don't mutate the original definition.
      var staticBinding = extend({}, defaults, definition);
      overrideMethod(staticBinding, "find", function(superfunc) {
        return function(scope) {
          var results = superfunc(scope);
          // Filter out Shiny outputs, we only want the static kind
          return filterByClass(results, "html-widget-output", false);
        };
      });
      window.HTMLWidgets.widgets.push(staticBinding);
  
      if (shinyMode) {
        // Shiny is running. Register the definition with an output binding.
        // The definition itself will not be the output binding, instead
        // we will make an output binding object that delegates to the
        // definition. This is because we foolishly used the same method
        // name (renderValue) for htmlwidgets definition and Shiny bindings
        // but they actually have quite different semantics (the Shiny
        // bindings receive data that includes lots of metadata that it
        // strips off before calling htmlwidgets renderValue). We can't
        // just ignore the difference because in some widgets it's helpful
        // to call this.renderValue() from inside of resize(), and if
        // we're not delegating, then that call will go to the Shiny
        // version instead of the htmlwidgets version.
  
        // Merge defaults with definition, without mutating either.
        var bindingDef = extend({}, defaults, definition);
  
        // This object will be our actual Shiny binding.
        var shinyBinding = new Shiny.OutputBinding();
  
        // With a few exceptions, we'll want to simply use the bindingDef's
        // version of methods if they are available, otherwise fall back to
        // Shiny's defaults. NOTE: If Shiny's output bindings gain additional
        // methods in the future, and we want them to be overrideable by
        // HTMLWidget binding definitions, then we'll need to add them to this
        // list.
        delegateMethod(shinyBinding, bindingDef, "getId");
        delegateMethod(shinyBinding, bindingDef, "onValueChange");
        delegateMethod(shinyBinding, bindingDef, "onValueError");
        delegateMethod(shinyBinding, bindingDef, "renderError");
        delegateMethod(shinyBinding, bindingDef, "clearError");
        delegateMethod(shinyBinding, bindingDef, "showProgress");
  
        // The find, renderValue, and resize are handled differently, because we
        // want to actually decorate the behavior of the bindingDef methods.
  
        shinyBinding.find = function(scope) {
          var results = bindingDef.find(scope);
  
          // Only return elements that are Shiny outputs, not static ones
          var dynamicResults = results.filter(".html-widget-output");
  
          // It's possible that whatever caused Shiny to think there might be
          // new dynamic outputs, also caused there to be new static outputs.
          // Since there might be lots of different htmlwidgets bindings, we
          // schedule execution for later--no need to staticRender multiple
          // times.
          if (results.length !== dynamicResults.length)
            scheduleStaticRender();
  
          return dynamicResults;
        };
  
        // Wrap renderValue to handle initialization, which unfortunately isn't
        // supported natively by Shiny at the time of this writing.
  
        shinyBinding.renderValue = function(el, data) {
          Shiny.renderDependencies(data.deps);
          // Resolve strings marked as javascript literals to objects
          if (!(data.evals instanceof Array)) data.evals = [data.evals];
          for (var i = 0; data.evals && i < data.evals.length; i++) {
            window.HTMLWidgets.evaluateStringMember(data.x, data.evals[i]);
          }
          if (!bindingDef.renderOnNullValue) {
            if (data.x === null) {
              el.style.visibility = "hidden";
              return;
            } else {
              el.style.visibility = "inherit";
            }
          }
          if (!elementData(el, "initialized")) {
            initSizing(el);
  
            elementData(el, "initialized", true);
            if (bindingDef.initialize) {
              var result = bindingDef.initialize(el, el.offsetWidth,
                el.offsetHeight);
              elementData(el, "init_result", result);
            }
          }
          bindingDef.renderValue(el, data.x, elementData(el, "init_result"));
          evalAndRun(data.jsHooks.render, elementData(el, "init_result"), [el, data.x]);
        };
  
        // Only override resize if bindingDef implements it
        if (bindingDef.resize) {
          shinyBinding.resize = function(el, width, height) {
            // Shiny can call resize before initialize/renderValue have been
            // called, which doesn't make sense for widgets.
            if (elementData(el, "initialized")) {
              bindingDef.resize(el, width, height, elementData(el, "init_result"));
            }
          };
        }
  
        Shiny.outputBindings.register(shinyBinding, bindingDef.name);
      }
    };
  
    var scheduleStaticRenderTimerId = null;
    function scheduleStaticRender() {
      if (!scheduleStaticRenderTimerId) {
        scheduleStaticRenderTimerId = setTimeout(function() {
          scheduleStaticRenderTimerId = null;
          window.HTMLWidgets.staticRender();
        }, 1);
      }
    }
  
    // Render static widgets after the document finishes loading
    // Statically render all elements that are of this widget's class
    window.HTMLWidgets.staticRender = function() {
      var bindings = window.HTMLWidgets.widgets || [];
      forEach(bindings, function(binding) {
        var matches = binding.find(document.documentElement);
        forEach(matches, function(el) {
          var sizeObj = initSizing(el, binding);
  
          if (hasClass(el, "html-widget-static-bound"))
            return;
          el.className = el.className + " html-widget-static-bound";
  
          var initResult;
          if (binding.initialize) {
            initResult = binding.initialize(el,
              sizeObj ? sizeObj.getWidth() : el.offsetWidth,
              sizeObj ? sizeObj.getHeight() : el.offsetHeight
            );
            elementData(el, "init_result", initResult);
          }
  
          if (binding.resize) {
            var lastSize = {
              w: sizeObj ? sizeObj.getWidth() : el.offsetWidth,
              h: sizeObj ? sizeObj.getHeight() : el.offsetHeight
            };
            var resizeHandler = function(e) {
              var size = {
                w: sizeObj ? sizeObj.getWidth() : el.offsetWidth,
                h: sizeObj ? sizeObj.getHeight() : el.offsetHeight
              };
              if (size.w === 0 && size.h === 0)
                return;
              if (size.w === lastSize.w && size.h === lastSize.h)
                return;
              lastSize = size;
              binding.resize(el, size.w, size.h, initResult);
            };
  
            on(window, "resize", resizeHandler);
  
            // This is needed for cases where we're running in a Shiny
            // app, but the widget itself is not a Shiny output, but
            // rather a simple static widget. One example of this is
            // an rmarkdown document that has runtime:shiny and widget
            // that isn't in a render function. Shiny only knows to
            // call resize handlers for Shiny outputs, not for static
            // widgets, so we do it ourselves.
            if (window.jQuery) {
              window.jQuery(document).on(
                "shown.htmlwidgets shown.bs.tab.htmlwidgets shown.bs.collapse.htmlwidgets",
                resizeHandler
              );
              window.jQuery(document).on(
                "hidden.htmlwidgets hidden.bs.tab.htmlwidgets hidden.bs.collapse.htmlwidgets",
                resizeHandler
              );
            }
  
            // This is needed for the specific case of ioslides, which
            // flips slides between display:none and display:block.
            // Ideally we would not have to have ioslide-specific code
            // here, but rather have ioslides raise a generic event,
            // but the rmarkdown package just went to CRAN so the
            // window to getting that fixed may be long.
            if (window.addEventListener) {
              // It's OK to limit this to window.addEventListener
              // browsers because ioslides itself only supports
              // such browsers.
              on(document, "slideenter", resizeHandler);
              on(document, "slideleave", resizeHandler);
            }
          }
  
          var scriptData = document.querySelector("script[data-for='" + el.id + "'][type='application/json']");
          if (scriptData) {
            var data = JSON.parse(scriptData.textContent || scriptData.text);
            // Resolve strings marked as javascript literals to objects
            if (!(data.evals instanceof Array)) data.evals = [data.evals];
            for (var k = 0; data.evals && k < data.evals.length; k++) {
              window.HTMLWidgets.evaluateStringMember(data.x, data.evals[k]);
            }
            binding.renderValue(el, data.x, initResult);
            evalAndRun(data.jsHooks.render, initResult, [el, data.x]);
          }
        });
      });
  
      invokePostRenderHandlers();
    }
  
  
    function has_jQuery3() {
      if (!window.jQuery) {
        return false;
      }
      var $version = window.jQuery.fn.jquery;
      var $major_version = parseInt($version.split(".")[0]);
      return $major_version >= 3;
    }
  
    /*
    / Shiny 1.4 bumped jQuery from 1.x to 3.x which means jQuery's
    / on-ready handler (i.e., $(fn)) is now asyncronous (i.e., it now
    / really means $(setTimeout(fn)).
    / https://jquery.com/upgrade-guide/3.0/#breaking-change-document-ready-handlers-are-now-asynchronous
    /
    / Since Shiny uses $() to schedule initShiny, shiny>=1.4 calls initShiny
    / one tick later than it did before, which means staticRender() is
    / called renderValue() earlier than (advanced) widget authors might be expecting.
    / https://github.com/rstudio/shiny/issues/2630
    /
    / For a concrete example, leaflet has some methods (e.g., updateBounds)
    / which reference Shiny methods registered in initShiny (e.g., setInputValue).
    / Since leaflet is privy to this life-cycle, it knows to use setTimeout() to
    / delay execution of those methods (until Shiny methods are ready)
    / https://github.com/rstudio/leaflet/blob/18ec981/javascript/src/index.js#L266-L268
    /
    / Ideally widget authors wouldn't need to use this setTimeout() hack that
    / leaflet uses to call Shiny methods on a staticRender(). In the long run,
    / the logic initShiny should be broken up so that method registration happens
    / right away, but binding happens later.
    */
    function maybeStaticRenderLater() {
      if (shinyMode && has_jQuery3()) {
        window.jQuery(window.HTMLWidgets.staticRender);
      } else {
        window.HTMLWidgets.staticRender();
      }
    }
  
    if (document.addEventListener) {
      document.addEventListener("DOMContentLoaded", function() {
        document.removeEventListener("DOMContentLoaded", arguments.callee, false);
        maybeStaticRenderLater();
      }, false);
    } else if (document.attachEvent) {
      document.attachEvent("onreadystatechange", function() {
        if (document.readyState === "complete") {
          document.detachEvent("onreadystatechange", arguments.callee);
          maybeStaticRenderLater();
        }
      });
    }
  
  
    window.HTMLWidgets.getAttachmentUrl = function(depname, key) {
      // If no key, default to the first item
      if (typeof(key) === "undefined")
        key = 1;
  
      var link = document.getElementById(depname + "-" + key + "-attachment");
      if (!link) {
        throw new Error("Attachment " + depname + "/" + key + " not found in document");
      }
      return link.getAttribute("href");
    };
  
    window.HTMLWidgets.dataframeToD3 = function(df) {
      var names = [];
      var length;
      for (var name in df) {
          if (df.hasOwnProperty(name))
              names.push(name);
          if (typeof(df[name]) !== "object" || typeof(df[name].length) === "undefined") {
              throw new Error("All fields must be arrays");
          } else if (typeof(length) !== "undefined" && length !== df[name].length) {
              throw new Error("All fields must be arrays of the same length");
          }
          length = df[name].length;
      }
      var results = [];
      var item;
      for (var row = 0; row < length; row++) {
          item = {};
          for (var col = 0; col < names.length; col++) {
              item[names[col]] = df[names[col]][row];
          }
          results.push(item);
      }
      return results;
    };
  
    window.HTMLWidgets.transposeArray2D = function(array) {
        if (array.length === 0) return array;
        var newArray = array[0].map(function(col, i) {
            return array.map(function(row) {
                return row[i]
            })
        });
        return newArray;
    };
    // Split value at splitChar, but allow splitChar to be escaped
    // using escapeChar. Any other characters escaped by escapeChar
    // will be included as usual (including escapeChar itself).
    function splitWithEscape(value, splitChar, escapeChar) {
      var results = [];
      var escapeMode = false;
      var currentResult = "";
      for (var pos = 0; pos < value.length; pos++) {
        if (!escapeMode) {
          if (value[pos] === splitChar) {
            results.push(currentResult);
            currentResult = "";
          } else if (value[pos] === escapeChar) {
            escapeMode = true;
          } else {
            currentResult += value[pos];
          }
        } else {
          currentResult += value[pos];
          escapeMode = false;
        }
      }
      if (currentResult !== "") {
        results.push(currentResult);
      }
      return results;
    }
    // Function authored by Yihui/JJ Allaire
    window.HTMLWidgets.evaluateStringMember = function(o, member) {
      var parts = splitWithEscape(member, '.', '\\');
      for (var i = 0, l = parts.length; i < l; i++) {
        var part = parts[i];
        // part may be a character or 'numeric' member name
        if (o !== null && typeof o === "object" && part in o) {
          if (i == (l - 1)) { // if we are at the end of the line then evalulate
            if (typeof o[part] === "string")
              o[part] = tryEval(o[part]);
          } else { // otherwise continue to next embedded object
            o = o[part];
          }
        }
      }
    };
  
    // Retrieve the HTMLWidget instance (i.e. the return value of an
    // HTMLWidget binding's initialize() or factory() function)
    // associated with an element, or null if none.
    window.HTMLWidgets.getInstance = function(el) {
      return elementData(el, "init_result");
    };
  
    // Finds the first element in the scope that matches the selector,
    // and returns the HTMLWidget instance (i.e. the return value of
    // an HTMLWidget binding's initialize() or factory() function)
    // associated with that element, if any. If no element matches the
    // selector, or the first matching element has no HTMLWidget
    // instance associated with it, then null is returned.
    //
    // The scope argument is optional, and defaults to window.document.
    window.HTMLWidgets.find = function(scope, selector) {
      if (arguments.length == 1) {
        selector = scope;
        scope = document;
      }
  
      var el = scope.querySelector(selector);
      if (el === null) {
        return null;
      } else {
        return window.HTMLWidgets.getInstance(el);
      }
    };
  
    // Finds all elements in the scope that match the selector, and
    // returns the HTMLWidget instances (i.e. the return values of
    // an HTMLWidget binding's initialize() or factory() function)
    // associated with the elements, in an array. If elements that
    // match the selector don't have an associated HTMLWidget
    // instance, the returned array will contain nulls.
    //
    // The scope argument is optional, and defaults to window.document.
    window.HTMLWidgets.findAll = function(scope, selector) {
      if (arguments.length == 1) {
        selector = scope;
        scope = document;
      }
  
      var nodes = scope.querySelectorAll(selector);
      var results = [];
      for (var i = 0; i < nodes.length; i++) {
        results.push(window.HTMLWidgets.getInstance(nodes[i]));
      }
      return results;
    };
  
    var postRenderHandlers = [];
    function invokePostRenderHandlers() {
      while (postRenderHandlers.length) {
        var handler = postRenderHandlers.shift();
        if (handler) {
          handler();
        }
      }
    }
  
    // Register the given callback function to be invoked after the
    // next time static widgets are rendered.
    window.HTMLWidgets.addPostRenderHandler = function(callback) {
      postRenderHandlers.push(callback);
    };
  
    // Takes a new-style instance-bound definition, and returns an
    // old-style class-bound definition. This saves us from having
    // to rewrite all the logic in this file to accomodate both
    // types of definitions.
    function createLegacyDefinitionAdapter(defn) {
      var result = {
        name: defn.name,
        type: defn.type,
        initialize: function(el, width, height) {
          return defn.factory(el, width, height);
        },
        renderValue: function(el, x, instance) {
          return instance.renderValue(x);
        },
        resize: function(el, width, height, instance) {
          return instance.resize(width, height);
        }
      };
  
      if (defn.find)
        result.find = defn.find;
      if (defn.renderError)
        result.renderError = defn.renderError;
      if (defn.clearError)
        result.clearError = defn.clearError;
  
      return result;
    }
  })();

  (function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.vegaTooltip = {}));
}(this, (function (exports) { 'use strict';

    var name = "vega-tooltip";
    var version = "0.22.1";
    var description = "A tooltip plugin for Vega-Lite and Vega visualizations.";
    var main = "build/vega-tooltip.js";
    var module = "build/src/index.js";
    var unpkg = "build/vega-tooltip.min.js";
    var jsdelivr = "build/vega-tooltip.min.js";
    var typings = "build/src/index.d.ts";
    var repository = {
        type: "git",
        url: "https://github.com/vega/vega-tooltip.git"
    };
    var keywords = [
        "vega-lite",
        "vega",
        "tooltip"
    ];
    var author = {
        name: "UW Interactive Data Lab",
        url: "https://idl.cs.washington.edu"
    };
    var collaborators = [
        "Dominik Moritz",
        "Sira Horradarn",
        "Zening Qu",
        "Kanit Wongsuphasawat",
        "Yuri Astrakhan",
        "Jeffrey Heer"
    ];
    var license = "BSD-3-Clause";
    var bugs = {
        url: "https://github.com/vega/vega-tooltip/issues"
    };
    var homepage = "https://github.com/vega/vega-tooltip#readme";
    var scripts = {
        prepare: "beemo create-config --silent",
        "tsc:src": "tsc -b tsconfig.src.json",
        build: "yarn tsc:src && rollup -c",
        clean: "rm -rf build examples/data && rm -f src/style.ts",
        "copy:data": "rsync -r node_modules/vega-datasets/data/* examples/data",
        "copy:build": "rsync -r build/* examples/build",
        "deploy:gh": "yarn build && yarn copy:build && gh-pages -d examples && yarn clean",
        prettierbase: "beemo prettier 'examples/*.{html,scss,css}'",
        eslintbase: "beemo eslint '{src,test,types}/**/*.ts'",
        format: "yarn eslintbase --fix && yarn prettierbase --write",
        lint: "yarn eslintbase && yarn prettierbase --check",
        postbuild: "terser build/vega-tooltip.js -c -m -o build/vega-tooltip.min.js",
        prebuild: "mkdir -p build && yarn copy:data && ./build-style.sh",
        prepublishOnly: "yarn clean && yarn build",
        preversion: "yarn lint",
        start: "yarn build && concurrently --kill-others -n Server,Typescript,Rollup 'browser-sync start -s -f build examples --serveStatic examples' 'yarn tsc:src -w' 'rollup -c -w'",
        pretest: "./build-style.sh",
        test: "jest"
    };
    var devDependencies = {
        "@rollup/plugin-commonjs": "11.0.2",
        "@rollup/plugin-json": "^4.0.2",
        "@rollup/plugin-node-resolve": "^7.1.1",
        "@types/jest": "^25.1.4",
        "browser-sync": "^2.26.7",
        concurrently: "^5.1.0",
        "gh-pages": "^2.2.0",
        jest: "^25.1.0",
        "node-sass": "^4.13.1",
        path: "^0.12.7",
        rollup: "^2.1.0",
        terser: "^4.6.7",
        "ts-jest": "^25.2.1",
        typescript: "^3.8.3",
        "vega-datasets": "^1.30.2",
        "vega-lite-dev-config": "^0.5.0",
        "vega-typings": "^0.14.2"
    };
    var dependencies = {
        "vega-util": "^1.13.1"
    };
    var beemo = {
        module: "vega-lite-dev-config",
        drivers: [
            "prettier",
            "eslint"
        ]
    };
    var jest = {
        testURL: "http://localhost/",
        transform: {
            "^.+\\.tsx?$": "ts-jest"
        },
        testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
        moduleFileExtensions: [
            "ts",
            "tsx",
            "js",
            "jsx",
            "json",
            "node"
        ],
        testPathIgnorePatterns: [
            "node_modules",
            "<rootDir>/build",
            "src"
        ]
    };
    var pkg = {
        name: name,
        version: version,
        description: description,
        main: main,
        module: module,
        unpkg: unpkg,
        jsdelivr: jsdelivr,
        typings: typings,
        repository: repository,
        keywords: keywords,
        author: author,
        collaborators: collaborators,
        license: license,
        bugs: bugs,
        homepage: homepage,
        scripts: scripts,
        devDependencies: devDependencies,
        dependencies: dependencies,
        beemo: beemo,
        jest: jest
    };

    // generated with build-style.sh
    var defaultStyle = `#vg-tooltip-element {
  visibility: hidden;
  padding: 8px;
  position: fixed;
  z-index: 1000;
  font-family: sans-serif;
  font-size: 11px;
  border-radius: 3px;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  /* The default theme is the light theme. */
  background-color: rgba(255, 255, 255, 0.95);
  border: 1px solid #d9d9d9;
  color: black; }
  #vg-tooltip-element.visible {
    visibility: visible; }
  #vg-tooltip-element h2 {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 13px; }
  #vg-tooltip-element table {
    border-spacing: 0; }
    #vg-tooltip-element table tr {
      border: none; }
      #vg-tooltip-element table tr td {
        overflow: hidden;
        text-overflow: ellipsis;
        padding-top: 2px;
        padding-bottom: 2px; }
        #vg-tooltip-element table tr td.key {
          color: #808080;
          max-width: 150px;
          text-align: right;
          padding-right: 4px; }
        #vg-tooltip-element table tr td.value {
          display: block;
          max-width: 300px;
          max-height: 7em;
          text-align: left; }
  #vg-tooltip-element.dark-theme {
    background-color: rgba(32, 32, 32, 0.9);
    border: 1px solid #f5f5f5;
    color: white; }
    #vg-tooltip-element.dark-theme td.key {
      color: #bfbfbf; }
`;

    const EL_ID = 'vg-tooltip-element';
    const DEFAULT_OPTIONS = {
        /**
         * X offset.
         */
        offsetX: 10,
        /**
         * Y offset.
         */
        offsetY: 10,
        /**
         * ID of the tooltip element.
         */
        id: EL_ID,
        /**
         * ID of the tooltip CSS style.
         */
        styleId: 'vega-tooltip-style',
        /**
         * The name of the theme. You can use the CSS class called [THEME]-theme to style the tooltips.
         *
         * There are two predefined themes: "light" (default) and "dark".
         */
        theme: 'light',
        /**
         * Do not use the default styles provided by Vega Tooltip. If you enable this option, you need to use your own styles. It is not necessary to disable the default style when using a custom theme.
         */
        disableDefaultStyle: false,
        /**
         * HTML sanitizer function that removes dangerous HTML to prevent XSS.
         *
         * This should be a function from string to string. You may replace it with a formatter such as a markdown formatter.
         */
        sanitize: escapeHTML,
        /**
         * The maximum recursion depth when printing objects in the tooltip.
         */
        maxDepth: 2,
    };
    /**
     * Escape special HTML characters.
     *
     * @param value A value to convert to string and HTML-escape.
     */
    function escapeHTML(value) {
        return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }
    function createDefaultStyle(id) {
        // Just in case this id comes from a user, ensure these is no security issues
        if (!/^[A-Za-z]+[-:.\w]*$/.test(id)) {
            throw new Error('Invalid HTML ID');
        }
        return defaultStyle.toString().replace(EL_ID, id);
    }

    function accessor(fn, fields, name) {
      fn.fields = fields || [];
      fn.fname = name;
      return fn;
    }

    function error(message) {
      throw Error(message);
    }

    function splitAccessPath(p) {
      var path = [],
          q = null,
          b = 0,
          n = p.length,
          s = '',
          i, j, c;

      p = p + '';

      function push() {
        path.push(s + p.substring(i, j));
        s = '';
        i = j + 1;
      }

      for (i=j=0; j<n; ++j) {
        c = p[j];
        if (c === '\\') {
          s += p.substring(i, j);
          s += p.substring(++j, ++j);
          i = j;
        } else if (c === q) {
          push();
          q = null;
          b = -1;
        } else if (q) {
          continue;
        } else if (i === b && c === '"') {
          i = j + 1;
          q = c;
        } else if (i === b && c === "'") {
          i = j + 1;
          q = c;
        } else if (c === '.' && !b) {
          if (j > i) {
            push();
          } else {
            i = j + 1;
          }
        } else if (c === '[') {
          if (j > i) push();
          b = i = j + 1;
        } else if (c === ']') {
          if (!b) error('Access path missing open bracket: ' + p);
          if (b > 0) push();
          b = 0;
          i = j + 1;
        }
      }

      if (b) error('Access path missing closing bracket: ' + p);
      if (q) error('Access path missing closing quote: ' + p);

      if (j > i) {
        j++;
        push();
      }

      return path;
    }

    var isArray = Array.isArray;

    function isObject(_) {
      return _ === Object(_);
    }

    function isString(_) {
      return typeof _ === 'string';
    }

    function $(x) {
      return isArray(x) ? '[' + x.map($) + ']'
        : isObject(x) || isString(x) ?
          // Output valid JSON and JS source strings.
          // See http://timelessrepo.com/json-isnt-a-javascript-subset
          JSON.stringify(x).replace('\u2028','\\u2028').replace('\u2029', '\\u2029')
        : x;
    }

    function field(field, name) {
      var path = splitAccessPath(field),
          code = 'return _[' + path.map($).join('][') + '];';

      return accessor(
        Function('_', code),
        [(field = path.length===1 ? path[0] : field)],
        name || field
      );
    }

    var empty = [];

    var id = field('id');

    var identity = accessor(function(_) { return _; }, empty, 'identity');

    var zero = accessor(function() { return 0; }, empty, 'zero');

    var one = accessor(function() { return 1; }, empty, 'one');

    var truthy = accessor(function() { return true; }, empty, 'true');

    var falsy = accessor(function() { return false; }, empty, 'false');

    var __rest = (undefined && undefined.__rest) || function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    };
    /**
     * Format the value to be shown in the toolip.
     *
     * @param value The value to show in the tooltip.
     * @param valueToHtml Function to convert a single cell value to an HTML string
     */
    function formatValue(value, valueToHtml, maxDepth) {
        if (isArray(value)) {
            return `[${value.map((v) => valueToHtml(isString(v) ? v : stringify(v, maxDepth))).join(', ')}]`;
        }
        if (isObject(value)) {
            let content = '';
            const _a = value, { title } = _a, rest = __rest(_a, ["title"]);
            if (title) {
                content += `<h2>${valueToHtml(title)}</h2>`;
            }
            const keys = Object.keys(rest);
            if (keys.length > 0) {
                content += '<table>';
                for (const key of keys) {
                    let val = rest[key];
                    // ignore undefined properties
                    if (val === undefined) {
                        continue;
                    }
                    if (isObject(val)) {
                        val = stringify(val, maxDepth);
                    }
                    content += `<tr><td class="key">${valueToHtml(key)}:</td><td class="value">${valueToHtml(val)}</td></tr>`;
                }
                content += `</table>`;
            }
            return content || '{}'; // show empty object if there are no properties
        }
        return valueToHtml(value);
    }
    function replacer(maxDepth) {
        const stack = [];
        return function (key, value) {
            if (typeof value !== 'object' || value === null) {
                return value;
            }
            const pos = stack.indexOf(this) + 1;
            stack.length = pos;
            if (stack.length > maxDepth) {
                return '[Object]';
            }
            if (stack.indexOf(value) >= 0) {
                return '[Circular]';
            }
            stack.push(value);
            return value;
        };
    }
    /**
     * Stringify any JS object to valid JSON
     */
    function stringify(obj, maxDepth) {
        return JSON.stringify(obj, replacer(maxDepth));
    }

    /**
     * Position the tooltip
     *
     * @param event The mouse event.
     * @param tooltipBox
     * @param offsetX Horizontal offset.
     * @param offsetY Vertical offset.
     */
    function calculatePosition(event, tooltipBox, offsetX, offsetY) {
        let x = event.clientX + offsetX;
        if (x + tooltipBox.width > window.innerWidth) {
            x = +event.clientX - offsetX - tooltipBox.width;
        }
        let y = event.clientY + offsetY;
        if (y + tooltipBox.height > window.innerHeight) {
            y = +event.clientY - offsetY - tooltipBox.height;
        }
        return { x, y };
    }

    /**
     * The tooltip handler class.
     */
    class Handler {
        /**
         * Create the tooltip handler and initialize the element and style.
         *
         * @param options Tooltip Options
         */
        constructor(options) {
            this.options = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
            const elementId = this.options.id;
            // bind this to call
            this.call = this.tooltipHandler.bind(this);
            // prepend a default stylesheet for tooltips to the head
            if (!this.options.disableDefaultStyle && !document.getElementById(this.options.styleId)) {
                const style = document.createElement('style');
                style.setAttribute('id', this.options.styleId);
                style.innerHTML = createDefaultStyle(elementId);
                const head = document.head;
                if (head.childNodes.length > 0) {
                    head.insertBefore(style, head.childNodes[0]);
                }
                else {
                    head.appendChild(style);
                }
            }
            // append a div element that we use as a tooltip unless it already exists
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.el = document.getElementById(elementId);
            if (!this.el) {
                this.el = document.createElement('div');
                this.el.setAttribute('id', elementId);
                this.el.classList.add('vg-tooltip');
                document.body.appendChild(this.el);
            }
        }
        /**
         * The tooltip handler function.
         */
        tooltipHandler(handler, event, item, value) {
            // console.log(handler, event, item, value);
            // hide tooltip for null, undefined, or empty string values
            if (value == null || value === '') {
                this.el.classList.remove('visible', `${this.options.theme}-theme`);
                return;
            }
            // set the tooltip content
            this.el.innerHTML = formatValue(value, this.options.sanitize, this.options.maxDepth);
            // make the tooltip visible
            this.el.classList.add('visible', `${this.options.theme}-theme`);
            const { x, y } = calculatePosition(event, this.el.getBoundingClientRect(), this.options.offsetX, this.options.offsetY);
            this.el.setAttribute('style', `top: ${y}px; left: ${x}px`);
        }
    }

    const version$1 = pkg.version;
    /**
     * Create a tooltip handler and register it with the provided view.
     *
     * @param view The Vega view.
     * @param opt Tooltip options.
     */
    function index (view, opt) {
        const handler = new Handler(opt);
        view.tooltip(handler.call).run();
        return handler;
    }

    exports.DEFAULT_OPTIONS = DEFAULT_OPTIONS;
    exports.Handler = Handler;
    exports.calculatePosition = calculatePosition;
    exports.createDefaultStyle = createDefaultStyle;
    exports.default = index;
    exports.escapeHTML = escapeHTML;
    exports.formatValue = formatValue;
    exports.replacer = replacer;
    exports.stringify = stringify;
    exports.version = version$1;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=vega-tooltip.js.map


/*
* FileSaver.js
* A saveAs() FileSaver implementation.
*
* By Eli Grey, http://eligrey.com
*
* License : https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md (MIT)
* source  : http://purl.eligrey.com/github/FileSaver.js
*/

// The one and only way of getting global scope in all environments
// https://stackoverflow.com/q/3277182/1008999
var _global = typeof window === 'object' && window.window === window
  ? window : typeof self === 'object' && self.self === self
  ? self : typeof global === 'object' && global.global === global
  ? global
  : this

function bom (blob, opts) {
  if (typeof opts === 'undefined') opts = { autoBom: false }
  else if (typeof opts !== 'object') {
    console.warn('Deprecated: Expected third argument to be a object')
    opts = { autoBom: !opts }
  }

  // prepend BOM for UTF-8 XML and text/* types (including HTML)
  // note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
  if (opts.autoBom && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
    return new Blob([String.fromCharCode(0xFEFF), blob], { type: blob.type })
  }
  return blob
}

function download (url, name, opts) {
  var xhr = new XMLHttpRequest()
  xhr.open('GET', url)
  xhr.responseType = 'blob'
  xhr.onload = function () {
    saveAs(xhr.response, name, opts)
  }
  xhr.onerror = function () {
    console.error('could not download file')
  }
  xhr.send()
}

function corsEnabled (url) {
  var xhr = new XMLHttpRequest()
  // use sync to avoid popup blocker
  xhr.open('HEAD', url, false)
  try {
    xhr.send()
  } catch (e) {}
  return xhr.status >= 200 && xhr.status <= 299
}

// `a.click()` doesn't work for all browsers (#465)
function click (node) {
  try {
    node.dispatchEvent(new MouseEvent('click'))
  } catch (e) {
    var evt = document.createEvent('MouseEvents')
    evt.initMouseEvent('click', true, true, window, 0, 0, 0, 80,
                          20, false, false, false, false, 0, null)
    node.dispatchEvent(evt)
  }
}

// Detect WebView inside a native macOS app by ruling out all browsers
// We just need to check for 'Safari' because all other browsers (besides Firefox) include that too
// https://www.whatismybrowser.com/guides/the-latest-user-agent/macos
var isMacOSWebView = /Macintosh/.test(navigator.userAgent) && /AppleWebKit/.test(navigator.userAgent) && !/Safari/.test(navigator.userAgent)

var saveAs = _global.saveAs || (
  // probably in some web worker
  (typeof window !== 'object' || window !== _global)
    ? function saveAs () { /* noop */ }

  // Use download attribute first if possible (#193 Lumia mobile) unless this is a macOS WebView
  : ('download' in HTMLAnchorElement.prototype && !isMacOSWebView)
  ? function saveAs (blob, name, opts) {
    var URL = _global.URL || _global.webkitURL
    var a = document.createElement('a')
    name = name || blob.name || 'download'

    a.download = name
    a.rel = 'noopener' // tabnabbing

    // TODO: detect chrome extensions & packaged apps
    // a.target = '_blank'

    if (typeof blob === 'string') {
      // Support regular links
      a.href = blob
      if (a.origin !== location.origin) {
        corsEnabled(a.href)
          ? download(blob, name, opts)
          : click(a, a.target = '_blank')
      } else {
        click(a)
      }
    } else {
      // Support blobs
      a.href = URL.createObjectURL(blob)
      setTimeout(function () { URL.revokeObjectURL(a.href) }, 4E4) // 40s
      setTimeout(function () { click(a) }, 0)
    }
  }

  // Use msSaveOrOpenBlob as a second approach
  : 'msSaveOrOpenBlob' in navigator
  ? function saveAs (blob, name, opts) {
    name = name || blob.name || 'download'

    if (typeof blob === 'string') {
      if (corsEnabled(blob)) {
        download(blob, name, opts)
      } else {
        var a = document.createElement('a')
        a.href = blob
        a.target = '_blank'
        setTimeout(function () { click(a) })
      }
    } else {
      navigator.msSaveOrOpenBlob(bom(blob, opts), name)
    }
  }

  // Fallback to using FileReader and a popup
  : function saveAs (blob, name, opts, popup) {
    // Open a popup immediately do go around popup blocker
    // Mostly only available on user interaction and the fileReader is async so...
    popup = popup || open('', '_blank')
    if (popup) {
      popup.document.title =
      popup.document.body.innerText = 'downloading...'
    }

    if (typeof blob === 'string') return download(blob, name, opts)

    var force = blob.type === 'application/octet-stream'
    var isSafari = /constructor/i.test(_global.HTMLElement) || _global.safari
    var isChromeIOS = /CriOS\/[\d]+/.test(navigator.userAgent)

    if ((isChromeIOS || (force && isSafari) || isMacOSWebView) && typeof FileReader !== 'undefined') {
      // Safari doesn't allow downloading of blob URLs
      var reader = new FileReader()
      reader.onloadend = function () {
        var url = reader.result
        url = isChromeIOS ? url : url.replace(/^data:[^;]*;/, 'data:attachment/file;')
        if (popup) popup.location.href = url
        else location = url
        popup = null // reverse-tabnabbing #460
      }
      reader.readAsDataURL(blob)
    } else {
      var URL = _global.URL || _global.webkitURL
      var url = URL.createObjectURL(blob)
      if (popup) popup.location = url
      else location.href = url
      popup = null // reverse-tabnabbing #460
      setTimeout(function () { URL.revokeObjectURL(url) }, 4E4) // 40s
    }
  }
)

_global.saveAs = saveAs.saveAs = saveAs

if (typeof module !== 'undefined') {
  module.exports = saveAs;
}


// parametrise graph encoding for MDS plot
function createXYSpec(xyData, xyTable, width, height)
{
  var tooltip = makeVegaTooltip(xyData.cols);

  // if an annotation is given, search for a symbol column (case insensitive)
  if (xyData.annoCols != -1) {
    var symbolIndex = xyData.annoCols.map(x => x.toLowerCase()).indexOf("symbol");
    var symbolField = symbolIndex >= 0 ? xyData.annoCols[symbolIndex] : "symbol";
  }

  return {
    "$schema": "https://vega.github.io/schema/vega/v5.json",
    "description": "Testing ground for GlimmaV2",
    "width": xyData.counts == -1 ? (width*0.9) : (width * 0.5),
    "height": height * 0.35,
    "padding": {"left": 0, "top": 0, "right": 0, "bottom": 10},
    "autosize": {"type": "fit", "resize": true},
    "title": {
      "text": xyData.title
    },
    "signals":
      [
        {
          "name": "click", "value": null,
          "on": [ {"events": "mousedown", "update": "[datum, now()]" } ]
        }
      ],
    "data": 
      [
        {
          "name": "source",
          "values": xyTable,
          "transform": [{
            "type": "formula",
            "expr": "datum.x",
            "as": "tooltip"
          }]
        },
        { "name": "selected_points" }
      ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "round": true,
        "nice": true,
        "zero": true,
        "domain": { "data": "source", "field": xyData.x },
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "round": true,
        "nice": true,
        "zero": true,
        "domain": { "data": "source", "field": xyData.y },
        "range": "height"
      },
      {
        "name": "colour_scale",
        "type": "ordinal",
        // co-ordinate w/ domain of status
        "domain": ["downReg", "nonDE", "upReg"],
        "range": xyData.statusColours
      }
    ],
    "legends": [
      {
        "fill": "colour_scale",
        "title": "Status",
        "symbolStrokeColor": "black",
        "symbolStrokeWidth": 1,
        "symbolOpacity": 0.7,
        "symbolType": "circle"
      }
    ],
    "axes" : [
      {
        "scale": "x",
        "grid": true,
        "domain": false,
        "orient": "bottom",
        "tickCount": 5,
        "title": xyData.x
      },
      {
        "scale": "y",
        "grid": true,
        "domain": false,
        "orient": "left",
        "titlePadding": 5,
        "title": xyData.y
      }
    ],
    "marks": [
      {
        "name": "marks",
        "type": "symbol",
        "from": { "data": "source" },
        "encode": {
          "update": {
            "x": { "scale": "x", "field": xyData.x },
            "y": { "scale": "y", "field": xyData.y },
            "shape": "circle",
            "size" : [ {"test": "datum.status == 0", "value": 5}, {"value": 25} ],
            "opacity": {"value": 0.65},
            "fill": { "scale": "colour_scale", "field": "status" },
            "strokeWidth": {"value": 1},
            "stroke": {"value": "transparent"},
            "tooltip": tooltip
          }
        }
      },
      // overlaying selected points
      {
        "name": "selected_marks",
        "type": "symbol",
        "from": { "data": "selected_points" },
        "encode": {
          "update": {
            "x": { "scale": "x", "field": xyData.x },
            "y": { "scale": "y", "field": xyData.y },
            "shape": "circle",
            "size": {"value": 120},
            "fill": { "scale": "colour_scale", "field": "status" },
            "strokeWidth": { "value": 1 },
            "stroke": { "value": "black" },
            "opacity": { "value": 1 },
            "tooltip": tooltip
          }
        }
      },
      // symbol text
      {
        "name": "selected_text",
        "type": "text",
        "from": { "data": "selected_points" },
        "encode": {
          "update": {
            "x": { "scale": "x", "field": xyData.x },
            "y": { "scale": "y", "field": xyData.y, "offset": -10 },
            "fill": { "value": "black" },
            "fontWeight": {"value": "bold"},
            "opacity": { "value": 1 },
            "text": {"field": xyData.annoCols == -1 ? "symbol" : symbolField },
            "fontSize": {"value": 12}
          }
        }
      }
    ]
  };
}

// parametrise graph encoding for MDS plot
function createMDSSpec(mdsData, dimList, features, width, height, continuousColour) 
{
  console.log(features);

  // generate tooltip object for embedding in spec
  var tooltipString = "{'x':datum[x_axis], 'y':datum[y_axis]";
  features["all"].forEach(function(x) 
  {
    // don't include dummy features in tooltip
    if (x != "-" && x != "- ")
    {
      tooltipString += `,'${x}':datum['${x}']`;
    }  
  });
  tooltipString += "}";
  console.log(tooltipString)
  var tooltip = { "signal" : tooltipString };
  
  // generate colorscheme options
  var colourschemes = continuousColour ? ["reds", "blues", "tealblues", "teals", "greens", "browns", "oranges", "reds", "purples", "warmgreys", "greys", "viridis", "plasma", "blueorange", "redblue"]
            : ["accent", "category10", "category20", "category20b", "category20c", "dark2", "paired", "pastel1", "pastel2", "set1", "set2", "set3", "tableau10", "tableau20"]
  //        : [ "tableau20", "tableau10", "category20", "category20b", "category20c", "set1", "set2", "set3", "pastel1", "pastel2", "paired", "dark2", "category10", "accent", "viridis", "plasma"];
  return {
    "$schema": "https://vega.github.io/schema/vega/v5.json",
    "description": "Testing ground for GlimmaV2",
    "width": width * 0.5,
    "height": height * 0.8,
    "padding": 0,
    "autosize": {"type": "fit", "resize": true},
    "title": { "text": "MDS Plot"},
    "signals":
      [
        {
          "name": "x_axis",
          "value": dimList[0],
          "bind": { "input": "select", "options": dimList }
        },
        {
          "name": "y_axis",
          "value": dimList[1],
          "bind": { "input": "select", "options": dimList }
        },
        {
          "name": "scale_by",
          "value": features["numeric"][0],
          "bind": { "input": "select", "options": features["numeric"] }
        },
        {
          "name": "colour_by",
          "value": features["discrete"][0],
          "bind": { "input": "select", "options": continuousColour ? features["numeric"] : features["discrete"] }
        },
        {
          "name": "shape_by",
          "value": features["discrete"][0],
          "bind": { "input": "select", "options": features["discrete"] }
        },
        {
          "name": "colourscheme",
          "value": colourschemes[1],
          "bind": { "input": "select", "options": colourschemes }
        }
      ],
    "data": 
      [
        {
          "name": "source",
          "values": mdsData,
          "transform": [{
            "type": "formula",
            "expr": "datum.x",
            "as": "tooltip"
          }]
        }
      ],
    "scales": [
      {
        "name": "x",
        "type": "linear",
        "round": true,
        "nice": true,
        "zero": true,
        "domain": { "data": "source", "field": { "signal": "x_axis" } },
        "range": "width"
      },
      {
        "name": "y",
        "type": "linear",
        "round": true,
        "nice": true,
        "zero": true,
        "domain": { "data": "source", "field": { "signal": "y_axis" } },
        "range": "height"
      },
      {
        "name": "size",
        "type": "linear",
        "round": true,
        "nice": false,
        "zero": true,
        "domain": { "data": "source", "field": { "signal": "scale_by" } },
        "range": [5, 350]
      },
      {
        "name": "color",
        "type": continuousColour ? "linear" : "ordinal",
        "domain": { "data": "source", "field": { "signal": "colour_by" } },
        "range": { "scheme": { "signal": "colourscheme" } }
      },
      {
        "name": "shape",
        "type": "ordinal",
        "domain": { "data": "source", "field": { "signal": "shape_by" } },
        "range": ["circle","square","diamond","triangle", "triangle-up", "cross"]
      }
    ],

    "axes": [
      {
        "scale": "x",
        "grid": true,
        "domain": false,
        "orient": "bottom",
        "tickCount": 5,
        "title": { "signal": "x_axis" }
      },
      {
        "scale": "y",
        "grid": true,
        "domain": false,
        "orient": "left",
        "titlePadding": 5,
        "title": { "signal": "y_axis" }
      }
    ],

    "legends": [
      {
        "size": "size",
        "title": "Scale",
        "format": "s",
        "symbolStrokeColor": "black",
        "symbolStrokeWidth": 0.5,
        "symbolOpacity": 0.9,
        "symbolType": "circle"
      },
      {
        "fill": "color",
        "title": "Colour",
        "symbolStrokeColor": "black",
        "symbolStrokeWidth": 0.5,
        "symbolOpacity": 0.9,
        "symbolType": "circle"
      },
      {
        "shape": "shape",
        "title": "Shape",
        "symbolStrokeColor": "black",
        "symbolStrokeWidth": 0.5,
        "symbolOpacity": 0.9,
      },
    ],

    "marks": [
      {
        "name": "marks",
        "type": "symbol",
        "from": { "data": "source" },
        "encode": {
          "update": {
            "x": { "scale": "x", "field": { "signal": "x_axis" } },
            "y": { "scale": "y", "field": { "signal": "y_axis" } },
            "size": { "scale": "size", "field": { "signal": "scale_by" }},
            "shape": { "scale": "shape", "field": { "signal": "shape_by" } },
            "fill": { "scale": "color", "field": { "signal": "colour_by" } },
            "strokeWidth": { "value": 0.5 },
            "opacity": { "value": 0.9 },
            "stroke": { "value": "black" },
            "tooltip": tooltip
          }
        }
      }
    ]
  };
}

// parametrise graph encoding for variance plot
function createEigenSpec(eigenData, width, height) 
{
  return {
    "$schema": "https://vega.github.io/schema/vega/v5.json",
    "description": "A basic bar chart example, with value labels shown upon mouse hover.",
    "width": width * 0.35,
    "height": height * 0.6,
    "padding": 0,
    "title": {
      "text": "Variance Explained"
    },
    "data": [
      {
        "name": "table",
        "values": eigenData
      }
    ],
  
    "signals": [
      {
        "name": "tooltip",
        "value": {},
        "on": 
        [
          {"events": "rect:mouseover", "update": "datum"},
          {"events": "rect:mouseout",  "update": "{}"}
        ]
      },
      {
        "name": "external_select_x",
        "value": 1
      },
      {
        "name": "external_select_y",
        "value": 2
      }
    ],
  
    "scales": [
      {
        "name": "xscale",
        "type": "band",
        "domain": {"data": "table", "field": "name"},
        "range": "width",
        "padding": 0.05,
        "round": true
      },
      {
        "name": "yscale",
        "domain": {"data": "table", "field": "eigen"},
        "range": "height"
      }
    ],
  
    "axes": [
      { "orient": "bottom", "scale": "xscale" },
      { "orient": "left", "scale": "yscale" }
    ],
  
    "marks": [
      {
        "type": "rect",
        "from": {"data":"table"},
        "encode": {
          "enter": {
            "x": {"scale": "xscale", "field": "name"},
            "width": {"scale": "xscale", "band": 1},
            "y": {"scale": "yscale", "field": "eigen"},
            "y2": {"scale": "yscale", "value": 0}
          },
          "update": {
            "fill": [ {"test": "datum.name == external_select_x || datum.name == external_select_y", "value": "#3d3f46"}, {"value":  "#afafaf"} ]
          }
        }
      },
      {
        "type": "text",
        "from": {"data":"table"},
        "encode": {
          "enter": {
            "align": {"value": "center"},
            "baseline": {"value": "bottom"},
            "fill": {"value": "#333"}
          },
          "update": {
            "x": {"scale": "xscale", "field": "name", "band": 0.5},
            "y": {"scale": "yscale", "field": "eigen", "offset": -2},
            "text": {"field": "eigen"},
            "fillOpacity": [
              {"test": "datum.name == external_select_x || datum.name == external_select_y", "value": 1},
              {"value": 0}
            ]
          }
        }
      }
    ]
  };
}

function createExpressionSpec(width, height, expColumns, sampleColours, samples)
{

    let colourscheme_signal = 
    {
        "name": "colourscheme",
        "value": "category10",
        "bind": { 
                    "input": "select", 
                    "options": [ "category10", "accent", "category20", "category20b", "category20c", "dark2", "paired", "pastel1", "pastel2", "set1", "set2", "set3", "tableau10", "tableau20"] 
                }
    };

    /* need an empty signal if sample.cols argument has been supplied */
    let samplecols_signal = { "name": "samplecols_active" };

    /* must match counts term in processExpression */
    expColumns.push("count");
    let tooltip = makeVegaTooltip(expColumns);
    return {
        "$schema": "https://vega.github.io/schema/vega/v5.json",
        "width": width*0.40,
        "height": height*0.35,
        "padding": {"left": 0, "top": 0, "right": 0, "bottom": 10},
        "autosize": {"type": "fit", "resize": true},
        "title": { "text": {"signal": "title_signal" }},
        "signals": 
                [ 
                    {
                        "name": "title_signal", 
                        "value": "" 
                    },
                    {
                        "name": "max_y_axis", 
                        "value": null,
                        "bind": { 
                                  "input": "number",
                                  "class": "max_y_axis"
                                }
                    },
                    {
                        "name": "max_count",
                        "value": 0
                    },
                    {
                        "name": "max_y",
                        "update": " (max_y_axis < max_count) ? null : max_y_axis"
                    },
                    sampleColours == -1 ? colourscheme_signal : samplecols_signal
                ],
        "data": [ {"name": "table"} ],
        "scales": 
        [
            {
                "name": "x",
                "type": "band",
                "padding":1,
                "domain": {"data": "table", "field": "group"},
                "range": "width"
            },
            {
                "name": "y",
                "domain": {"data": "table", "field": "count"},
                "range": "height",
                "domainMax": {"signal": "max_y"}
            },
            {
                "name": "color",
                "type": "ordinal",
                "domain": sampleColours == -1 ? { "data": "table", "field": "group" } : samples,
                "range": sampleColours == -1 ? { "scheme": { "signal": "colourscheme" } } : sampleColours
            }
        ],
        "axes": 
        [
            {
                "scale": "x",
                "orient": "bottom",
                "title": "group",
                "labelAngle": -45,
                "labelAlign": "right",
                "labelOffset": -3  
            },
            {
                "scale": "y",
                "grid": true,
                "orient": "left",
                "titlePadding": 5,
                "title": "expression"
            }
        ],
        "marks": 
        [{
                "name": "marks",
                "type": "symbol",
                "from": {"data": "table"},
                "encode": {
                    "update": {
                        "x": {"scale": "x", "field": "group"},
                        "y": {"scale": "y", "field": "count"},
                        "shape": {"value": "circle"},
                        "fill": { "scale": "color", "field": sampleColours == -1 ? "group" : "sample" },
                        "strokeWidth": {"value": 1},
                        "opacity": {"value": 0.8},
                        "size": {"value": 100},
                        "stroke": {"value": "#575757"},
                        "tooltip": tooltip
                    }
                }
            }]
    };

}

function makeVegaTooltip(columns)
{
    // generate tooltip object for embedding in spec
    let tooltipString = "{";
    columns.forEach(x => tooltipString += `'${x}':datum['${x}'],`);
    tooltipString += "}";
    var tooltip = { "signal" : tooltipString };
    return tooltip;
}


function addSavePlotButton(controlContainer, xy_obj, exp_obj=null, 
    text="Save Plot", summaryText="Summary plot", expressionText="Expression plot") 
  {
    // set up button elements
    var dropdownDiv = document.createElement("div");
    dropdownDiv.setAttribute("class", "dropdown");
  
    var dropdownButton = document.createElement("button");
    dropdownButton.setAttribute("class", "save-button");
    dropdownButton.innerHTML = text;
  
    var dropdownContent = document.createElement("div");
    dropdownContent.setAttribute("class", "dropdown-content");
    
    var pngSummaryBtn = addSaveButtonElement(xy_obj, text=summaryText+" (PNG)", type='png');
    var svgSummaryBtn = addSaveButtonElement(xy_obj, text=summaryText+" (SVG)", type='svg');
    
    // add elements to container
    dropdownDiv.appendChild(dropdownButton);
    dropdownDiv.appendChild(dropdownContent);
  
    dropdownContent.appendChild(pngSummaryBtn);
    dropdownContent.appendChild(svgSummaryBtn);
  
    // add the expression buttons if expression plot is active
    if (exp_obj) {
      var pngExpressionBtn = addSaveButtonElement(exp_obj, text=expressionText+" (PNG)", type='png');
      var svgExpressionBtn = addSaveButtonElement(exp_obj, text=expressionText+" (SVG)", type='svg');
    
      dropdownContent.appendChild(pngExpressionBtn);
      dropdownContent.appendChild(svgExpressionBtn);
    }
  
    // set up dropdown action
    dropdownButton.onclick = function() {
      dropdownOnClick(dropdownContent);
    };
  
    controlContainer.appendChild(dropdownDiv);
  
    // set up dropdown hide when clicking elsewhere
    // global window.dropdownHide so this event is only added once
    if (!window.dropdownHide) {
      function hideDropdowns(event) {
        if (!event.target.matches(".save-button")) {
          var dropdowns = document.getElementsByClassName("dropdown-content");
  
          for (const dropdown_i of dropdowns) {
            if (dropdown_i.classList.contains("show")) {
              dropdown_i.classList.remove("show");
            }
          }
        }
      }
  
      window.addEventListener("click", hideDropdowns);
  
      window.dropdownHide = true;
    }
  }
  
  function dropdownOnClick(dropdownContent) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    for (const dropdown_i of dropdowns){
      if (dropdown_i.classList.contains("show")) {
        dropdown_i.classList.remove("show");
      }
    }
    dropdownContent.classList.toggle("show");
  }
  
  function addSaveButtonElement(view_obj, text, type) {
    // create a save button element for the save dropdown
    var saveButton = document.createElement("a");
    saveButton.setAttribute("href", "#");
    saveButton.innerText = text;
    saveButton.onclick = function() {
      view_obj.toImageURL(type, scaleFactor=3).then(function (url) {
        var link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('target', '_blank');
        link.setAttribute('download', 'vega-export.' + type);
        link.dispatchEvent(new MouseEvent('click'));
      });
    };
    return saveButton;
  }
  
  function addSaveDataElement(state, data, saveAllText, saveSelectText) {
    buttonContainer = document.getElementsByClassName("saveSubset")[0].parentElement;
  
    var dropdownDiv = document.createElement("div");
    dropdownDiv.setAttribute("class", "dropdown");
  
    var dropdownContent = document.createElement("div");
    dropdownContent.setAttribute("class", "dropdown-content dataDropdown");
  
    var saveSelectBtn = document.createElement("a");
    saveSelectBtn.setAttribute("href", "#");
    saveSelectBtn.setAttribute("class", "saveSelectButton");
    saveSelectBtn.innerText = saveSelectText;
    saveSelectBtn.onclick = function() {
      saveTableClickListener(state, data, false);
    };
  
    var saveAllBtn = document.createElement("a");
    saveAllBtn.setAttribute("href", "#");
    saveAllBtn.innerText = saveAllText;
    saveAllBtn.onclick = function() {
      saveTableClickListener(state, data, true);
    };
  
    dropdownContent.appendChild(saveSelectBtn);
    dropdownContent.appendChild(saveAllBtn);
    buttonContainer.appendChild(dropdownContent);
  } 
  
  function saveTableClickListener(state, data, save_all)
  {
    if (save_all)
    {
      if (confirm(`This will save the table and counts data for all ${data.xyTable.length} genes.`)) 
      {
        /* only include counts if it is provided */
        let arr = data.countsMatrix==null ? 
          data.xyTable : data.xyTable.map( x => $.extend(x, data.countsMatrix[x.index]) );
        saveJSONArrayToCSV(arr);
      }
    }
    else
    {
      let concatData = data.countsMatrix==null ?
        state.selected : state.selected.map( x => $.extend(x, data.countsMatrix[x.index]) );
      saveJSONArrayToCSV(concatData);
    }
  }
  
  
  function saveJSONArrayToCSV(jsonArray)
  {
    let csvData = JSONArrayToCSV(jsonArray);
    var blob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
    saveAs(blob, "glimmaTable.csv");
  }
  
  
  /* credit: https://stackoverflow.com/questions/8847766/how-to-convert-json-to-csv-format-and-store-in-a-variable */
  function JSONArrayToCSV(array)
  {
    var fields = Object.keys(array[0])
    var replacer = function(key, value) { return value === null ? '' : value } 
    var csv = array.map(function(row){
      return fields.map(function(fieldName){
        return JSON.stringify(row[fieldName], replacer)
      }).join(',')
    })
    csv.unshift(fields.join(',')) // add header column
    csv = csv.join('\r\n');
    return csv;
  }

  HTMLWidgets.widget({

    name: 'glimmaXY',
  
    type: 'output',
  
    factory: function(el, width, height) 
    {
  
      var plotContainer = document.createElement("div");
      var controlContainer = document.createElement("div");
      plotContainer.setAttribute("class", "plotContainer");
      controlContainer.setAttribute("class", "controlContainer");
  
      var widget = document.getElementById(el.id);
      widget.appendChild(plotContainer);
      widget.appendChild(controlContainer);
  
      return {
  
        renderValue: function(x) 
        {
          
          console.log(x);
          var handler = new vegaTooltip.Handler();
  
          // create container elements
          var xyContainer = document.createElement("div");
          xyContainer.setAttribute("class", "xyContainerSingle");
          plotContainer.appendChild(xyContainer);
  
          var xyTable = HTMLWidgets.dataframeToD3(x.data.table)
          var xySpec = createXYSpec(x.data, xyTable, width, height);
          var xyView = new vega.View(vega.parse(xySpec), {
            renderer: 'svg',
            container: xyContainer,
            bind: controlContainer,
            hover: true
          });
          xyView.tooltip(handler.call);
          xyView.runAsync();
  
          var countsMatrix = null;
          var expressionView = null;
          var expressionContainer = null;
          if (x.data.counts != -1)
          {
            expressionContainer = document.createElement("div");
            expressionContainer.setAttribute("class", "expressionContainer");
            plotContainer.appendChild(expressionContainer);
            xyContainer.setAttribute("class", "xyContainer");
            countsMatrix = HTMLWidgets.dataframeToD3(x.data.counts);
            var expressionSpec = createExpressionSpec(width, height, x.data.expCols, x.data.sampleColours, x.data.samples);
            var expressionView = new vega.View(vega.parse(expressionSpec), {
              renderer: 'svg',
              container: expressionContainer,
              hover: true
            });
            expressionView.tooltip(handler.call);
            expressionView.runAsync();
          }
  
          var data =
          {
            xyView: xyView,
            expressionView: expressionView,
            xyTable: xyTable,
            countsMatrix: countsMatrix,
            controlContainer: controlContainer,
            height: height,
            cols: x.data.cols,
            groups: x.data.groups,
            levels: x.data.levels,
            expressionContainer: expressionContainer
          };
  
          setupXYInteraction(data);
          addSavePlotButton(controlContainer, xyView, expressionView, "Save Plot");
          if (expressionView) {
            addAxisMessage(data);
          }
        },
  
        resize: function(width, height) 
        {}
  
      };
    }
  });
  
  class State {
  
    /**
     * Returns state machine object retaining the current set of selected genes and managing
     * whether the app is in graph selection mode or table selection mode
     * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
     * @return {State} state machine object
     */
    constructor(data) {
      this.data = data;
      this.graphMode = false;
      this._selected = [];
    }
    
    /**
     * Returns current selection of genes
     * @return {Array} Array of currently selected genes
     */
    get selected() {
      return this._selected;
    }
  
    /**
     * Sets a new array of selected genes and re-renders elements accordingly
     * @param  {Array} selected Array of genes which are currently selected
     */
    set selected(selected) {
      this._selected = selected;
      let htmlString = selected.map(x => `<span>${x.gene}</span>`).join("");
      $(this.data.controlContainer.getElementsByClassName("geneDisplay")[0])
        .html(htmlString);
      /* update save btn */
      $(this.data.controlContainer.getElementsByClassName("saveSelectButton")[0])
        .html(`Save (${selected.length})`);
      /* update clear btn */
      $(this.data.controlContainer.getElementsByClassName("clearSubset")[0])
        .html(`Clear (${selected.length})`);
    }
    
    /**
     * Adds a gene to the selection if it's not already selected, or remove it otherwise
     * @param  {Gene} gene Gene data object which has been clicked on
     */
    toggleGene(gene) {
      let loc = containsGene(this.selected, gene);
      this.selected = loc >= 0 ? remove(this.selected, loc) : this.selected.concat(gene);
      this._expressionUpdateHandler(loc < 0, gene);
    }
    
    /**
     * Manages updates to the expression plot based on the most recently selected gene
     * @param {Boolean} selectionOccurred True if a gene was selected, false if it was de-selected
     * @param  {Gene} gene Gene data object which has been clicked on
     */
    _expressionUpdateHandler(selectionOccurred, gene) {
      if (!this.data.expressionView) return;
      if (selectionOccurred) {
        let countsRow = this.data.countsMatrix[gene.index];
        updateExpressionPlot(countsRow, this.data, gene.gene);
      }
      else if (this.selected.length > 0) {
        let last = this.selected[this.selected.length-1];
        let countsRow = this.data.countsMatrix[last.index];
        updateExpressionPlot(countsRow, this.data, last.gene);
      }
      else {
        clearExpressionPlot(this.data);
      }
    }
  
  }
  
  /**
   * Generates datatable DOM object, state machine and assigns event listeners
   * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
   */
  function setupXYInteraction(data)
  {
  
    var state = new State(data);
    var datatableEl = document.createElement("TABLE");
    datatableEl.setAttribute("class", "dataTable");
    data.controlContainer.appendChild(datatableEl);
  
    $(document).ready(function() 
    {
      var datatable = $(datatableEl).DataTable(
        {
          data: data.xyTable,
          columns: data.cols.map(el => ({"data": el, "title": el})),
          rowId: "gene",
          dom: '<"geneDisplay fade-in">Bfrtip',
          buttons: {
            dom: {
              buttonContainer: {
                tag: 'div',
                className: 'buttonContainer'
              }
            },
            buttons: [
                      {
                        text: 'Clear (0)',
                        action: () => clearTableListener(datatable, state, data),
                        attr: {class: 'save-button clearSubset'}
                      },
                      { 
                        text: 'Save Data',
                        action: () => showDataDropdown(),
                        attr: {class: 'save-button saveSubset'}
                      }
                    ]
                  },
          scrollY: (data.height*0.4).toString() + "px",
          scrollX: false,
          orderClasses: false,
          stripeClasses: ['stripe1','stripe2']
        });
  
      datatable.on('click', 'tr', function() { tableClickListener(datatable, state, data, $(this)) } );
      data.xyView.addSignalListener('click', function(name, value) { XYSignalListener(datatable, state, value[0], data) } );
  
      $(document.getElementsByClassName("saveSubset")[0]).html(`Save Data`);
      addSaveDataElement(state, data, `Save All`, `Save (0)`);
    });
  }
  
  /**
   * Shows Save Data options
   */
  function showDataDropdown() {
    let dataDropdown = document.getElementsByClassName("dataDropdown")[0];
    dropdownOnClick(dataDropdown);
  }
  
  /**
   * Responds to a click on the Clear datatable button
   * @param  {Datatable} datatable datatable object
   * @param  {State} state state machine object returned by getStateMachine()
   * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
   */
  function clearTableListener(datatable, state, data)
  {
    state.graphMode = false;
    state.selected = [];
    datatable.rows('.selected').nodes().to$().removeClass('selected');
    datatable.search('').columns().search('').draw();       
    data.xyView.data("selected_points", state.selected);
    data.xyView.runAsync();
    clearExpressionPlot(data);
    console.log(state);
  }
  
  /**
   * Listens and responds to click events on the datatable
   * @param  {Datatable} datatable datatable object
   * @param  {State} state state machine object returned by getStateMachine()
   * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
   * @param  {Row} row row object in the table clicked on by the user
   */
  function tableClickListener(datatable, state, data, row)
  {
    if (state.graphMode) return;
    row.toggleClass('selected');
    let datum = datatable.row(row).data();
    state.toggleGene(datum);
    data.xyView.data("selected_points", state.selected);
    data.xyView.runAsync();
  }
  
  /**
   * Listens and responds to click events on the XY plot
   * @param  {Datatable} datatable datatable object
   * @param  {State} state state machine object returned by getStateMachine()
   * @param  {Datum} datum point on the graph clicked on by the user
   * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
   */
  function XYSignalListener(datatable, state, datum, data)
  {
    if (datum == null) return;
    if (!state.graphMode)
    {
      state.graphMode = true;
      datatable.rows('.selected').nodes().to$().removeClass('selected');
      state.selected = [];
    }
  
    state.toggleGene(datum);
  
    // edge case: deselecting last point
    if (state.selected.length == 0)
      state.graphMode = false;
  
    data.xyView.data("selected_points", state.selected);
    data.xyView.runAsync();
  
    datatable.search('').columns().search('').draw();
    var regex_search = state.selected.map(x => '^' + x.gene + '$').join('|');
    datatable.columns(0).search(regex_search, regex=true, smart=false).draw();
  }
  
  /**
   * Resets expression plot to a blank slate
   * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
   */
  function clearExpressionPlot(data)
  {
    
    if (!data.expressionView)
      return;
    
    data.expressionView.data("table", []);
    data.expressionView.signal("title_signal", "");
    data.expressionView.signal("max_count", 0);
    data.expressionView.runAsync();
    updateAxisMessage(data);
  }
  
  /**
   * Updates expression plot for the given gene and sample counts
   * @param  {CountsRow} countsRow Data object containing sample counts for a given gene
   * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
   * @param  {String} geneName name of gene being displayed
   */
  function updateExpressionPlot(countsRow, data, geneName)
  {
    let groups = data.groups.group;
    let samples = data.groups.sample;
    let levels = data.levels;
    let result = [];
    for (col in countsRow) 
    {
      if (!samples.includes(col)) continue;
      let curr = {};
      let group = groups[samples.indexOf(col)];
      curr["group"] = group;
      curr["sample"] = col;
      curr["count"] = countsRow[col];
      result.push(curr);
    }
    if (levels != null) {
      result.sort((a, b) => levels.indexOf(a.group) - levels.indexOf(b.group));
    }
    data.expressionView.data("table", result);
    data.expressionView.signal("title_signal", "Gene " + geneName.toString());
    let max_value = Math.max(...result.map(x => x.count));
    data.expressionView.signal("max_count", Math.round(max_value*100)/100 );
    data.expressionView.runAsync();
    updateAxisMessage(data);
  }
  
  /**
   * Adds y-axis scaling message DOM objects to the expression plot
   * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
   */
  function addAxisMessage(data)
  {
    var bindings = data.expressionContainer.getElementsByClassName("vega-bindings")[0];
    var alertBox = document.createElement("div");
    alertBox.setAttribute("class", "alertBox invisible");
    data.expressionView.addSignalListener('max_y_axis', 
      function(name, value) { updateAxisMessage(data) });
    bindings.appendChild(alertBox);
  }
  
  /**
   * Updaes the y-axis scaling for the expression plot
   * @param  {Data} data encapsulated data object containing references to Vega graphs and DOM elements
   */
  function updateAxisMessage(data)
  {
    var alertBox = data.expressionContainer.getElementsByClassName("alertBox")[0];
    let maxCount = data.expressionView.signal("max_count");
    let userValue = data.expressionView.signal("max_y_axis");
    if (userValue == null || userValue == "" || Number(userValue) >= maxCount)
    {
      alertBox.setAttribute("class", "alertBox invisible");
    }
    else
    {
      alertBox.innerHTML = `Max count value is ${maxCount}`;
      alertBox.setAttribute("class", "alertBox danger");
    }
  }
  
  /**
   * Searches an array gene data objects to determine if it contains a given gene.
   * @param  {Array} arr array of gene data objects.
   * @param  {Datum} datum given gene object
   * @return {Integer} -1 if the given gene is not found; index of the gene in arr otherwise.
   */
  function containsGene(arr, datum)
  {
    let loc = -1;
    let i;
    for (i = 0; i < arr.length; i++)
    {
      if (arr[i]['gene'] === datum['gene'])
      {
        loc = i;
        break;
      } 
    }
    return loc;
  }
  
  /**
   * Removes an element at the given index from an array and returns the result.
   * @param  {Array} arr array of elements.
   * @param  {Integer} i index i of element to be removed from arr.
   * @return {Array} modified array with element at index i removed.
   */
  function remove(arr, i)
  {
    let new_arr = arr.slice(0, i).concat(arr.slice(i+1))
    return new_arr;
  }