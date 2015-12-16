;
$(document).ready(function() {
  // create sidebar and attach to menu open
  $('.ui.sidebar')
	.sidebar('attach events', '.toc.item')
  ;

  $('.ui.accordion')
  .accordion()
  ;

  $('a[href^="#"]').on('click',function (e) {
	    e.preventDefault();

	    var target = this.hash;
	    var $target = $(target);

	    var $menu = $(".top.fixed.menu");

	    $('html, body').stop().animate({
	        'scrollTop': $target.offset().top - $menu.height()
	    }, 900, 'swing');
	});

  	var quotes = $(".quotes");
  	var quoteIndex = -1;

    function showNextQuote() {
        ++quoteIndex;
        quotes.eq(quoteIndex % quotes.length)
            .fadeIn(2000)
            .delay(2000)
            .fadeOut(2000, showNextQuote);
    }

    showNextQuote();

});