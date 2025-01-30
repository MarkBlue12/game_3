// script.js
const storyHistoryElement = document.getElementById('story-history');
const userInputElement = document.getElementById('user-input');
const submitButton = document.getElementById('submit-action');

// Initialize story with first segment
let fullStory = [{
  type: 'story',
  content: "Once upon a time, there is a 20 yrs old young man from England"
}];

// Initial display setup
updateStoryDisplay();

function updateStoryDisplay() {
  // Clear current story display
  storyHistoryElement.innerHTML = '';
  
  // Create elements for each story segment
  fullStory.forEach(segment => {
    const segmentDiv = document.createElement('div');
    segmentDiv.className = `story-segment ${segment.type}`;
    
    if (segment.type === 'user') {
      segmentDiv.innerHTML = `
        <div class="user-action">
          <strong>Your Decision:</strong> 
          <em>${segment.content}</em>
        </div>
      `;
    } else {
      segmentDiv.innerHTML = `
        <div class="story-text">${segment.content}</div>
      `;
    }
    
    storyHistoryElement.appendChild(segmentDiv);
  });

  // Auto-scroll to bottom
  storyHistoryElement.scrollTop = storyHistoryElement.scrollHeight;
}

submitButton.addEventListener('click', async () => {
  const userInput = userInputElement.value.trim();

  // Validate input
  if (!userInput) {
    alert('Please enter an action before submitting!');
    return;
  }

  // Disable button during processing
  submitButton.disabled = true;
  submitButton.textContent = 'Creating Story...';

  try {
    // Get story continuation
    const response = await fetch('https://game-3.vercel.app/api/generate-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: userInput,
        storySoFar: fullStory
          .filter(segment => segment.type === 'story')
          .map(segment => segment.content)
          .join('\n\n')
      }),
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    
    const data = await response.json();

    // Add user action and story continuation
    fullStory.push(
      { type: 'user', content: userInput },
      { type: 'story', content: data.story }
    );

    // Keep last 20 segments (10 interactions)
    if (fullStory.length > 20) {
      fullStory = fullStory.slice(-20);
    }

    // Update display and clear input
    updateStoryDisplay();
    userInputElement.value = '';

  } catch (error) {
    console.error('Error:', error);
    storyHistoryElement.innerHTML += `
      <div class="error-message">
        Failed to generate story: ${error.message}
      </div>
    `;
  } finally {
    // Reset button state
    submitButton.disabled = false;
    submitButton.textContent = 'Submit';
  }
});