document.addEventListener('DOMContentLoaded', function() {
    // Add the navigation styles
    const style = document.createElement('style');
    style.textContent = `
        .site-nav {
            margin-top: 2rem;
            margin-bottom: 2rem;
            padding-top: 2rem;
            padding-bottom: 2rem;
            border-top: 1px solid #758781;
            border-bottom: 1px solid #758781;
            max-width: 1400px;
            padding-left: 1rem;
            width: calc(87.5% - 1rem);
            margin-left: 0;
        }
        .site-nav ul {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            justify-content: flex-start;
            gap: 2rem;
            align-items: center;
        }
        .site-nav li {
            margin: 0;
            padding: 0;
            line-height: 1;
        }
        .site-nav a {
            text-decoration: none;
            color: #111;
            font-size: 1.1rem;
            font-family: et-book, Palatino, "Palatino Linotype", "Palatino LT STD", "Book Antiqua", Georgia, serif;
            display: inline-block;
            line-height: 1;
        }
        .site-nav a:hover {
            color: #666;
        }
        @media (max-width: 760px) {
            .site-nav {
                padding-left: 1rem;
                padding-right: 1rem;
                width: calc(100% - 2rem);
            }
        }
    `;
    document.head.appendChild(style);

    // Create a container for the navigation
    const navContainer = document.createElement('div');
    navContainer.id = 'nav-container';
    
    // Get the current page's path
    const currentPath = window.location.pathname;
    const isLocal = window.location.protocol === 'file:';
    
    // Adjust the nav.html path based on whether we're running locally or on a server
    const navPath = isLocal ? 'nav.html' : 'nav.html';
    
    // Fetch the navigation HTML
    fetch(navPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            // Insert the navigation HTML into the container
            navContainer.innerHTML = html;
            
            // Find the article element and insert the navigation before it
            const article = document.querySelector('article');
            if (article) {
                article.parentNode.insertBefore(navContainer, article);
            } else {
                console.warn('No article element found to insert navigation before');
            }
        })
        .catch(error => {
            console.error('Error loading navigation:', error);
            // Fallback: Create a simple navigation if the fetch fails
            const fallbackNav = document.createElement('nav');
            fallbackNav.className = 'site-nav';
            fallbackNav.innerHTML = `
                <ul>
                    <li><a style="font-weight: 100; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif">tsmilton</a></li>
                    <li><a href="index.html">Home</a></li>
                </ul>   
            `;
            document.body.insertBefore(fallbackNav, document.body.firstChild);
        });
}); 