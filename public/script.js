const storyText = document.getElementById('story-text');
const submitButton = document.getElementById('submit-action');
const storyHistoryElement = document.getElementById('story-history');
let fullStory = [{
  type: 'story',
  content: "Once upon a time, there is a 20 yrs old young man from England"
}];

// Initial display
updateStoryDisplay();

function updateStoryDisplay() {
  storyHistoryElement.innerHTML = '';
  fullStory.forEach(segment => {
    const div = document.createElement('div');
    div.className = `story-segment ${segment.type}`;
    div.innerHTML = segment.type === 'user' 
      ? `<span class="user-action">You decided:</span> ${segment.content}`
      : segment.content;
    storyHistoryElement.appendChild(div);
  });
  // Auto-scroll to bottom
  storyHistoryElement.scrollTop = storyHistoryElement.scrollHeight;
}

submitButton.addEventListener('click', async () => {
  const userInput = document.getElementById('user-input').value.trim();
  
  if (!userInput) {
    storyText.textContent = "Please enter an action!";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Generating...";

  try {
    const response = await fetch('https://game-3.vercel.app/api/generate-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: userInput,
        storySoFar: storyHistory.join("\n\n")
      }),
    });
        // Update story history
    fullStory.push({
        type: 'user',
        content: userInput
    });
    fullStory.push({
        type: 'story',
        content: data.story
    });

    // Keep only last 20 segments (10 interactions)
    if (fullStory.length > 20) {
        fullStory = fullStory.slice(-20);
    }

    updateStoryDisplay();
    document.getElementById('user-input').value = '';

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    storyHistory.push(`User action: ${userInput}`);
    storyHistory.push(`Story continuation: ${data.story}`);
    
    if (storyHistory.length > 20) {
      storyHistory = storyHistory.slice(-20);
    }

    storyText.textContent = data.story;
    document.getElementById('user-input').value = '';

  } catch (error) {
    console.error('Error:', error);
    storyText.textContent = error.message.startsWith("HTTP error") 
      ? "Server error. Please try later."
      : "Connection failed. Check your network.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit";
  }
});