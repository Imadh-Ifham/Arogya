import { Request, Response, NextFunction } from "express";
import { validationResult, ValidationChain } from "express-validator";

// This is a middleware factory — it takes an array of validation rules
// and returns a middleware function that runs them.
//
// Usage in routes:
//   router.post('/login', validate([loginRules]), authController.login)
//
// If any rule fails, we respond with 422 (Unprocessable Entity) immediately
// — the controller never even runs. This keeps controllers clean.

export const validate = (validations: ValidationChain[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Run all validation rules in parallel
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map((e) => ({
          field: e.type === "field" ? e.path : "unknown",
          message: e.msg,
        })),
      });
      return;
    }

    next();
  };
};
