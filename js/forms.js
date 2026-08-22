async function handleNewsletterSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const emailInput = form.querySelector('input[type="email"]');
  const button = form.querySelector('button[type="submit"]');
  const btnText = button.querySelector('.btn-text');
  const btnSpinner = button.querySelector('.btn-spinner');
  const email = emailInput ? emailInput.value.trim() : '';

  if (!email) {
    showToast('Please enter a valid email', 'error');
    return;
  }

  // Show loading state
  button.disabled = true;
  btnText.style.display = 'none';
  btnSpinner.style.display = 'inline-flex';

  try {
    const response = await fetch(`${API_BASE}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        source: 'footer'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Subscription failed');
    }

    showToast(data.message || 'Successfully subscribed!', 'success');
    form.reset();
  } catch (error) {
    console.error('Newsletter Error:', error);
    showToast(error.message || 'Server connection error', 'error');
  } finally {
    // Hide loading state
    button.disabled = false;
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
  }
}

async function handleGiveawaySubmit(e) {
  e.preventDefault();

  console.log("🎟 Giveaway form submitted");

  const form = e.target;

  const button = form.querySelector("button[type='submit']");
  const btnText = button.querySelector(".btn-text");
  const spinner = button.querySelector(".btn-spinner");

  button.disabled = true;

  btnText.style.display = "none";
  spinner.style.display = "inline-flex";

 try {

  const formData = new FormData(form);

  const selectedEvent =
    formData.get("selectedGiveawayEvent");

  const participationCode =
    formData.get("participationCode")?.trim() || null;

  console.log({
  firstName: formData.get("firstName"),
  lastName: formData.get("lastName"),
  email: formData.get("email"),
  phone: formData.get("phone"),
  selectedEvent,
  listenerStatus: formData.get("listenerStatus"),
  source: formData.get("source"),
  participationCode
});

// Validate the code, if one was entered

if (participationCode) {

  const { data: codeRecord, error: codeError } =
  await supabaseClient
    .from("emoji_codes")
    .select("*")
    .eq("code", participationCode)
    .eq("active", true)
    .maybeSingle();

  console.log("Code lookup:", codeRecord);

  if (!codeRecord) {

  alert("Invalid Participation Code");

  button.disabled = false;
  btnText.style.display = "";
  spinner.style.display = "none";

  return;

}

}

  const payload = {
    first_name: formData.get("firstName"),
    last_name: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    selected_event: selectedEvent,
    listener_status: formData.get("listenerStatus"),
    source: formData.get("source"),
    participation_code: participationCode,
    bonus_entries: participationCode ? 1 : 0
  };

  console.log("Payload:", payload);

  const { data, error } = await supabaseClient
    .from("giveaway_entries")
    .insert([payload])
    .select();

  console.log("Inserted:", data);

  if (error) {
    throw error;
  }

  console.log("✅ Supabase insert successful", data);

  logAnalyticsEvent('giveaway_entry', { page: 'giveaways' });

  showToast(
  "🎟 Entry submitted successfully!",
  "success"
);

  form.reset();

  document.getElementById("selectedGiveawayEvent").value =
    selectedEvent;

} catch (err) {

  console.error("❌ Supabase Error:", err);

  showToast(
  err.message || "Something went wrong.",
  "error"
);

  } finally {

    button.disabled = false;

    btnText.style.display = "";
    spinner.style.display = "none";

  }
}

/* ========== FORM SUBMIT HANDLER (UPDATED WITH SPINNER) ========== */
async function handleFormSubmit(event, type) {
  event.preventDefault();

  const button = event.target.querySelector('button[type="submit"]');
  const btnText = button.querySelector('.btn-text');
  const btnSpinner = button.querySelector('.btn-spinner');
  const form = event.target;

  // Show loading state
  button.disabled = true;
  btnText.style.display = 'none';
  btnSpinner.style.display = 'inline-flex';

  try {
    if (type === 'contact') {
      const payload = {
        first_name: document.getElementById('contactFirstName').value.trim(),
        last_name: document.getElementById('contactLastName').value.trim(),
        email: document.getElementById('contactEmail').value.trim(),
        subject: document.getElementById('contactSubject').value,
        message: document.getElementById('contactMessage').value.trim()
      };

      const response = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'Message sent successfully!', 'success');
        form.reset();
      } else {
        showToast(data.message || 'Failed to send message', 'error');
      }
    }
  } catch (error) {
    console.error('Form Error:', error);
    showToast('Unable to connect to server', 'error');
  } finally {
    // Hide loading state
    button.disabled = false;
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
  }
}