document.addEventListener('DOMContentLoaded', function() {
    // Create the navigation element
    const nav = document.createElement('nav');
    nav.className = 'site-nav';
    nav.innerHTML = `
        <ul>
            <li><a style="font-weight: 100; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif">tsmilton</a></li>
            <li><a href="index.html">Home</a></li>
            <li><a href="widgets.html">Widgets</a></li>
            <li><a href="scrapbook.html">Amodo</a></li>
        </ul>
    `;

    // Find the article element and insert the navigation before it
    const article = document.querySelector('article');
    if (article) {
        article.parentNode.insertBefore(nav, article);
    } else {
        console.warn('No article element found to insert navigation before');
    }
}); 