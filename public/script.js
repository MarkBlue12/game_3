// script.js
document.getElementById('submit-action').addEventListener('click', async () => {
  try {
    const userInput = document.getElementById('user-input').value;
      const storyText = document.getElementById('story-text');
    
      // Call the backend API to get the next part of the story
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: userInput }),
      });
    
      const data = await response.json();
      storyText.textContent = data.story;
      document.getElementById('user-input').value = ''; // Clear input
    } catch (error) {
      storyText.textContent = "Oops! Something went wrong. Please try again.";
    }
  });