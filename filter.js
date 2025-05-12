document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('#filter-tags .filter-button');
    
    // Set initial state
    filterButtons[0].classList.add('active'); // "All" tag is active by default

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');

            const selectedTag = this.getAttribute('data-tag');
            console.log('Selected tag:', selectedTag);

            // Get all post sections
            const postSections = document.querySelectorAll('.post-section');
            console.log('Found posts:', postSections.length);
            
            postSections.forEach(section => {
                const tagContainer = section.querySelector('.tag-container');
                if (tagContainer) {
                    const sectionTags = tagContainer.querySelectorAll('.tag-tile');
                    const sectionTagsArray = Array.from(sectionTags).map(tag => tag.textContent.toLowerCase());
                    console.log('Post:', section.querySelector('h3').textContent, 'Tags:', sectionTagsArray);

                    if (selectedTag === 'all' || sectionTagsArray.includes(selectedTag)) {
                        section.style.display = 'block';
                        console.log('Showing post:', section.querySelector('h3').textContent);
                    } else {
                        section.style.display = 'none';
                        console.log('Hiding post:', section.querySelector('h3').textContent);
                    }
                }
            });
        });
    });
}); 