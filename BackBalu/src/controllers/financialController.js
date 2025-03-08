const { Expense } = require('../data'); // Adjust the models as per your schema



// Get financial expenses
const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.findAll(); // Adjust the query as per your schema
    res.status(200).json({
      error: false,
      data: expenses
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error fetching expenses',
      details: error.message
    });
  }
};

// Create a new expense
const createExpense = async (req, res) => {
  try {
    const { description, amount, expenseDate } = req.body;
    res.status(201).json({
      error: false,
      data: newExpense
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error creating expense',
      details: error.message
    });
  }
};

module.exports = {
  
  getExpenses,
  createExpense
};