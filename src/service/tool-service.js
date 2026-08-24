const { TOOL_DEFINITIONS } = require("../tools/tool-definitions");
const ToolExecutor = require("../tools/tool-executor");

class ToolService {
  constructor() {
    this.toolExecutor = new ToolExecutor();
    this.definitions = TOOL_DEFINITIONS;
  }

  getToolDefinitions() {
    return this.definitions;
  }

  async executeTool(toolName, args = {}, context = {}) {
    if (!toolName || typeof toolName !== "string") {
      throw new Error("A valid toolName string is required.");
    }

    const availableToolNames = this.definitions.map((t) => t.function.name);
    if (!availableToolNames.includes(toolName)) {
      return {
        success: false,
        tool: toolName,
        error: `Tool '${toolName}' is not recognized. Available tools: ${availableToolNames.join(", ")}`,
      };
    }

    let result;
    switch (toolName) {
      case "searchProducts":
        result = await this.toolExecutor.searchProducts(args);
        break;
      case "getProduct":
        result = await this.toolExecutor.getProduct(args);
        break;
      case "getInventory":
        result = await this.toolExecutor.getInventory(args);
        break;
      case "getCart":
        result = await this.toolExecutor.getCart(args, context);
        break;
      case "getUserOrders":
        result = await this.toolExecutor.getUserOrders(args, context);
        break;
      case "getOrderDetails":
        result = await this.toolExecutor.getOrderDetails(args, context);
        break;
      case "getPaymentDetails":
        result = await this.toolExecutor.getPaymentDetails(args, context);
        break;
      default:
        result = { success: false, error: `Unhandled tool: ${toolName}` };
    }

    return {
      success: result.success !== false,
      tool: toolName,
      args,
      data: result,
    };
  }
}

module.exports = ToolService;
