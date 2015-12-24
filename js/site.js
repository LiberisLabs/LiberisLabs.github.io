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

  $("#job-types").change(function(){
    var selected = $( "#job-types option:selected" ).val();
    var $jobs = $('div[data-job-type]');
    
    if(selected === ''){
      $jobs.fadeIn();
    }
    else{
      $jobs.each(function( index, element ) {
        $element  = $(element);
        if($element.data('job-type') === selected){
          $element.fadeIn();
        }else{
          $element.fadeOut();
        }
     });
    }
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

