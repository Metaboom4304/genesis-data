export async function syncUser(user) {
  const { id, first_name, last_name, username } = user

  const response = await fetch('https://nysjreargnvyjmcirinp.supabase.co/rest/v1/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55c2pyZWFyZ252eWptY2lyaW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDgxNDIsImV4cCI6MjA3MDM4NDE0Mn0.UZpiU_nM_ACF8bILAGF4oa-WSHaU38KX6Dtz_srZK9Q',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55c2pyZWFyZ252eWptY2lyaW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDgxNDIsImV4cCI6MjA3MDM4NDE0Mn0.UZpiU_nM_ACF8bILAGF4oa-WSHaU38KX6Dtz_srZK9Q'
    },
    body: JSON.stringify({
      id,
      first_name,
      last_name,
      username
    })
  })

  const result = await response.json()
  console.log('User inserted:', result)
}
