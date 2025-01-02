
var slideshowDuration = 1;
var slideshow = $('.main-content .slideshow');

var portfolio_data;


function CheckRatio() {
    if (window.innerWidth < window.innerHeight) {
        document.getElementById("projectlist").parentElement.style.width = "20%"
        document.getElementById("slideContent").style.width = "80%"
        document.getElementById("backbutton").style.width = "80px"
        document.getElementById("backbutton").style.height = "80px"
    }
    else {
        document.getElementById("projectlist").parentElement.style.width = "10%"
        document.getElementById("slideContent").style.width = "90%"
        document.getElementById("backbutton").style.width = "50px"
        document.getElementById("backbutton").style.height = "50px"
    }
}
function GetPortfolioData() {
    CheckRatio();
    if (portfolio_data == null) {
        window.addEventListener('resize', () => {
            CheckRatio()
        }, false)
        fetch("assets/data/portfolio_data.json")
            .then(res => res.json())
            .then((out) => {
                portfolio_data = out;
                CreateProjectList();
                Init();
            })
            .catch(err => {
                console.error("Get project data error!!!")
            });
    }
    else {
        ActiveProject(portfolio_data[0]);
    }
};


function CreateProjectList() {
    portfolio_data.forEach(project => {
        CreateProjectButton(project);
    });
    ActiveProject(portfolio_data[0]);
}
function CreateProjectButton(project) {
    let projectDiv = document.getElementById("projectlist")
    let btn = document.createElement("li")
    btn.addEventListener("click", () => {
        ActiveProject(project);
    })
    btn.project_data = project
    btn.classList.add("image-button")
    let img = document.createElement("img")
    img.src = project.thumbnail;
    btn.appendChild(img)
    projectDiv.appendChild(btn)
}

function ActiveProject(project) {
    ClearContent();
    for (let i = 0; i < project.contents.length; i++) {
        if (i == 0) {
            CreateImage(project.contents[i], project.name, true)
            CreatePagination(i, true);

        }
        else {
            CreateImage(project.contents[i], project.name)
            CreatePagination(i);

        }

    }
    Init();

}

function CreateImage(content, name, isActive = false) {
    // Create the slide div
    const slideDiv = document.createElement('div');
    if (isActive) {
        slideDiv.classList.add('slide');
        slideDiv.classList.add('is-active');
    } else {
        slideDiv.classList.add('slide');
    }

    // Create the slide-content div
    const slideContentDiv = document.createElement('div');
    slideContentDiv.classList.add('slide-content');
    slideDiv.appendChild(slideContentDiv);

    // Create the caption div
    const captionDiv = document.createElement('div');
    captionDiv.classList.add('caption');
    slideContentDiv.appendChild(captionDiv);

    // Create the title div
    const titleDiv = document.createElement('div');
    titleDiv.classList.add('title');
    titleDiv.textContent = name;
    captionDiv.appendChild(titleDiv);

    // Create the image-container div
    const imageContainerDiv = document.createElement('div');
    imageContainerDiv.classList.add('image-container');
    slideDiv.appendChild(imageContainerDiv);



    if (content.includes("youtube")) {
        // Create the iframe element
        const youtubeIframe = document.createElement('iframe');
        // youtubeIframe.width = '100%';
        // youtubeIframe.height = '100%';
        youtubeIframe.src = content;
        youtubeIframe.title = 'YouTube video player';
        youtubeIframe.frameborder = '0';
        youtubeIframe.allow = 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        youtubeIframe.referrerPolicy = 'strict-origin-when-cross-origin';
        youtubeIframe.allowFullscreen = true;
        youtubeIframe.allowscriptaccess = "always"
        youtubeIframe.classList.add("iframe");
        imageContainerDiv.appendChild(youtubeIframe);
    }
    else {
        // Create the image element
        const imageElement = document.createElement('img');
        imageElement.classList.add('image');
        imageElement.src = content;
        imageElement.alt = '';
        imageContainerDiv.appendChild(imageElement);
    }
    document.getElementById("slides").appendChild(slideDiv);

}
function CreatePagination(index, isActive = false) {
    // Create the item div
    const itemDiv = document.createElement('div');
    if (isActive) {
        itemDiv.classList.add('item');
        itemDiv.classList.add('is-active');
    }
    else {
        itemDiv.classList.add('item');

    }

    // Create the icon span
    const iconSpan = document.createElement('span');
    iconSpan.classList.add('icon');
    iconSpan.textContent = index;

    // Append the icon span to the item div
    itemDiv.appendChild(iconSpan);

    document.getElementById("pagination").appendChild(itemDiv);
}

function ClearContent() {
    RemoveAllChildren(document.getElementById("pagination"));
    RemoveAllChildren(document.getElementById("slides"));
}
function RemoveAllChildren(element) {
    if (!(element instanceof Element)) {
        throw new Error('clearChildren() requires an Element object as the argument');
    }

    // Remove all child nodes from the element
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}


function slideshowSwitch(slideshow, index, auto) {
    if (slideshow.data('wait')) return;

    var slides = slideshow.find('.slide');
    var pages = slideshow.find('.pagination');
    var activeSlide = slides.filter('.is-active');
    var activeSlideImage = activeSlide.find('.image-container');
    var newSlide = slides.eq(index);
    var newSlideImage = newSlide.find('.image-container');
    var newSlideContent = newSlide.find('.slide-content');
    var newSlideElements = newSlide.find('.caption > *');
    if (newSlide.is(activeSlide)) return;

    newSlide.addClass('is-new');
    var timeout = slideshow.data('timeout');
    clearTimeout(timeout);
    slideshow.data('wait', true);
    var transition = slideshow.attr('data-transition');
    if (transition == 'fade') {
        newSlide.css({
            display: 'block',
            zIndex: 2
        });
        newSlideImage.css({
            opacity: 0
        });

        TweenMax.to(newSlideImage, 1, {
            alpha: 1,
            onComplete: function () {
                newSlide.addClass('is-active').removeClass('is-new');
                activeSlide.removeClass('is-active');
                newSlide.css({ display: '', zIndex: '' });
                newSlideImage.css({ opacity: '' });
                slideshow.find('.pagination').trigger('check');
                slideshow.data('wait', false);
                if (auto) {
                    timeout = setTimeout(function () {
                        slideshowNext(slideshow, false, true);
                    }, slideshowDuration);
                    slideshow.data('timeout', timeout);
                }
            }
        });
    } else {
        if (newSlide.index() > activeSlide.index()) {
            var newSlideRight = 0;
            var newSlideLeft = 'auto';
            var newSlideImageRight = -slideshow.width() / 8;
            var newSlideImageLeft = 'auto';
            var newSlideImageToRight = 0;
            var newSlideImageToLeft = 'auto';
            var newSlideContentLeft = 'auto';
            var newSlideContentRight = 0;
            var activeSlideImageLeft = -slideshow.width() / 4;
        } else {
            var newSlideRight = '';
            var newSlideLeft = 0;
            var newSlideImageRight = 'auto';
            var newSlideImageLeft = -slideshow.width() / 8;
            var newSlideImageToRight = '';
            var newSlideImageToLeft = 0;
            var newSlideContentLeft = 0;
            var newSlideContentRight = 'auto';
            var activeSlideImageLeft = slideshow.width() / 4;
        }

        newSlide.css({
            display: 'block',
            width: 0,
            right: newSlideRight,
            left: newSlideLeft
            , zIndex: 2
        });

        newSlideImage.css({
            width: slideshow.width(),
            right: newSlideImageRight,
            left: newSlideImageLeft
        });

        newSlideContent.css({
            width: slideshow.width(),
            left: newSlideContentLeft,
            right: newSlideContentRight
        });

        activeSlideImage.css({
            left: 0
        });
        TweenMax.set(newSlideElements, { y: 20, force3D: true });
        TweenMax.to(activeSlideImage, 1, {
            left: activeSlideImageLeft,
            ease: Power3.easeInOut
        });

        TweenMax.to(newSlide, 1, {
            width: slideshow.width(),
            ease: Power3.easeInOut
        });

        TweenMax.to(newSlideImage, 1, {
            right: newSlideImageToRight,
            left: newSlideImageToLeft,
            ease: Power3.easeInOut
        });

        TweenMax.staggerFromTo(newSlideElements, 0.8, { alpha: 0, y: 0 }, { alpha: 1, y: 0, ease: Power3.easeOut, force3D: true, delay: 0.1 }, 0.1, function () {
            newSlide.addClass('is-active').removeClass('is-new');
            activeSlide.removeClass('is-active');
            newSlide.css({
                display: '',
                width: '',
                left: '',
                zIndex: ''
            });

            newSlideImage.css({
                width: '',
                right: '',
                left: ''
            });

            newSlideContent.css({
                width: '',
                left: ''
            });

            newSlideElements.css({
                opacity: '',
                transform: ''
            });

            activeSlideImage.css({
                left: ''
            });

            slideshow.find('.pagination').trigger('check');
            slideshow.data('wait', false);
            if (auto) {
                timeout = setTimeout(function () {
                    slideshowNext(slideshow, false, true);
                }, slideshowDuration);
                slideshow.data('timeout', timeout);
            }
        });
    }
}

function slideshowNext(slideshow, previous, auto) {
    var slides = slideshow.find('.slide');
    var activeSlide = slides.filter('.is-active');
    if (activeSlide.length > 0) {
        let youtube = activeSlide.find(".iframe")
        if (youtube.length > 0) {
            pauseYoutubeIframe(youtube[0])
        }
    }
    var newSlide = null;
    if (previous) {
        newSlide = activeSlide.prev('.slide');
        if (newSlide.length === 0) {
            newSlide = slides.last();
        }
    } else {
        newSlide = activeSlide.next('.slide');
        if (newSlide.length == 0)
            newSlide = slides.filter('.slide').first();
    }

    slideshowSwitch(slideshow, newSlide.index(), auto);
}

function homeSlideshowParallax() {
    var scrollTop = $(window).scrollTop();
    if (scrollTop > windowHeight) return;
    var inner = slideshow.find('.slideshow-inner');
    var newHeight = windowHeight - (scrollTop / 2);
    var newTop = scrollTop * 0.8;

    inner.css({
        transform: 'translateY(' + newTop + 'px)', height: newHeight
    });
}

function Init() {
    $('.slide').addClass('is-loaded');

    $('.slideshow .arrows .arrow').on('click', function () {
        slideshowNext($(this).closest('.slideshow'), $(this).hasClass('prev'));
    });

    $('.slideshow .pagination .item').on('click', function () {
        slideshowSwitch($(this).closest('.slideshow'), $(this).index());
    });

    $('.slideshow .pagination').on('check', function () {
        var slideshow = $(this).closest('.slideshow');
        var pages = $(this).find('.item');
        var index = slideshow.find('.slides .is-active').index();
        pages.removeClass('is-active');
        pages.eq(index).addClass('is-active');
    });

    /* Lazyloading
    $('.slideshow').each(function(){
      var slideshow=$(this);
      var images=slideshow.find('.image').not('.is-loaded');
      images.on('loaded',function(){
        var image=$(this);
        var slide=image.closest('.slide');
        slide.addClass('is-loaded');
      });
    */

    // var timeout = setTimeout(function () {
    //     slideshowNext(slideshow, false, false);
    // }, slideshowDuration);

    // slideshow.data('timeout', timeout);
};

if ($('.main-content .slideshow').length > 1) {
    $(window).on('scroll', homeSlideshowParallax);
}
function pauseYoutubeIframe(iframe) {
    // // Get the YouTube player instance
    // const player = new YT.Player(iframe);

    // // Pause the video
    // player.pauseVideo();

    // iframe.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
    iframe.src = iframe.src;
}