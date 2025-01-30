// script.js
const storyText = document.getElementById('story-text'); // Add this at the top
const submitButton = document.getElementById('submit-action');

let storyHistory = ["Once upon a time, there is a 20 yrs old young man from England"]; // Initial story
submitButton.addEventListener('click', async () => {
  const userInput = document.getElementById('user-input').value;
  
  try {
    const response = await fetch('https://game-3.vercel.app/api/generate-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: userInput }),
    });

    const data = await response.json();
    storyText.textContent = data.story; // Now works globally
    document.getElementById('user-input').value = ''; // Clear input
  } catch (error) {
    console.error('Error:', error);
    storyText.textContent = "Something went wrong!";
  }
});

