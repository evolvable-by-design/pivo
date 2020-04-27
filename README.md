# Pivo

> An intent-based programming HTTP client to build evolvable-by-design clients of RESTful APIs

## Why Pivo? The problem statement.

Is has become common practice: we use RESTful APIs to access and manipulate data on frontend applications. And to build these frontends, we separate the view logic from the API interaction logic. While the view logic is materialized through components and routing, the API interaction logic is dispatched into entity-specific services. For example, to build a Trello board that displays cards into columns put side by side, we would likely create the `Board`, `Column` and `Card` components along with the `BoardService`, `ColumnService` and `CardService`. Then, the code we write looks like:

```jsx
// View Logic of the Card component
function Column (columnId) {
  display(<div>Loading ...</div>)
  const column = await ColumnService.getDetails(columnId)
  display(
    <div class="column">
      <h1>{column.name}</h1>

      { column.cards.forEach(card =>
          display(<card><h2>{card.title}</h2></card>)
      )}

      <form title="Create a new task">
        <input label="name" type="text" />
        <button onClick={name => ColumnService.createCard(columnId, name)}>
          Create new task
        </button>
      </form>

    </div>
  )
}

// API interaction logic
class ColumnService {
  async getDetails(columnId) {
    return http.get('/api/v1/column/' + columnId).body
  }

  async createCard(columnId, name) {
    http.post({
      url: '/api/v1/column/' + columnId + 'card/',
      body: { name }})
  }
}
```

But APIs evolve over time. For example `/api/v1/column/:columnId/card` may be replaced with `/api/v2/cards` and the creation of the card may require an additional `description` parameter in v2, to send in the request body along with the `name` and `columnId`. Moreover, API providers can remove an old version of their API at anytime.

As a consequence, the code of the frontend have to be maintained to ensure that it will not break. Unfortunately, this task is no fun, time-consuming and error prone.

## Pivo proposition

Instead of writing such likely-to-break code, we propose you to write code that will not break when the API evolve.

Going back to the previous example, we propose to write the following code on the frontend:

```jsx
// View Logic of the Card component
function Column (columnId) {
  display(<div>Loading ...</div>)
  const column = await ColumnService.getDetails(columnId)
  const columnName = column.get('/api/docs/dictionary#name')
  const columnCards = column.get('/api/docs/dictionary#cards')

  const createTaskOperation = ColumnService.getCreateTaskOperation(columnId)
  display(
    <div class="column">
      <h1>{columnName}</h1>

      { columnCards.forEach(card => {
          const cardName = card.get('/api/docs/dictionary#name')
          display(<card><h2>{cardName}</h2></card>)
      })}

      <form title="Create a new task" generateInputsFor={createTaskOperation.schema.parameters}>
        <button onClick={values => createTaskOperation.invoke(values)}>
          Create new task
        </button>
      </form>

    </div>
  )
}

// API interaction logic
class ColumnService {
  apiDocumentation = fetchLatestVersionOfApiDocumentation()

  async getDetails(columnId) {
    const parameters = { '/api/docs/dictionary#columnId': columnId }
    return apiDocumentation
      .findOperationThat('/api/docs/dictionary#getColumnDetails')
      .withDefaultParameters(parameters)
      .invoke()
      .body
  }

  getCreateTaskOperation(columnId) {
    const parameters = { '/api/docs/dictionary#columnId': columnId }
    return apiDocumentation
      .findOperationThat('http://famous-dictionary.org#createTask')
      .withDefaultParameters(parameters)
  }
}
```

The main difference of this piece of code is that it reads the API documentation .... TO BE CONTINUED

> While this code is verbose to explicit the concepts, much of the complexity is hidden when using Pivo.

## General Information

- At the moment the project is on GitHub because it is convenient for me to do so
- Readme in progress, I focus on the library at first and will document it when it will be ready to use
- Contributing guide not done yet
- Do not hesitate to get in touch with me for more information

## Todo

- Tests
- Support research function
- Make the library way more robust
