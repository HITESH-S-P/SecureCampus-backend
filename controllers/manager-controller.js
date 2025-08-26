const bcrypt = require("bcrypt");
const manager = require("../models/managerSchema.js");
const Subject = require("../models/subjectSchema.js");

const managerRegister = async (req, res) => {
  const { name, email, password, role, school, teachSubject, teachSclass } =
    req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);

    const manager = new manager({
      name,
      email,
      password: hashedPass,
      role,
      school,
      teachSubject,
      teachSclass,
    });

    const existingmanagerByEmail = await manager.findOne({ email });

    if (existingmanagerByEmail) {
      res.send({ message: "Email already exists" });
    } else {
      let result = await manager.save();
      await Subject.findByIdAndUpdate(teachSubject, { manager: manager._id });
      result.password = undefined;
      res.send(result);
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

const managerLogIn = async (req, res) => {
  try {
    let manager = await manager.findOne({ email: req.body.email });
    if (manager) {
      const validated = await bcrypt.compare(
        req.body.password,
        manager.password
      );
      if (validated) {
        manager = await manager.populate("teachSubject", "subName sessions");
        manager = await manager.populate("school", "schoolName");
        manager = await manager.populate("teachSclass", "sclassName");
        manager.password = undefined;
        res.send(manager);
      } else {
        res.send({ message: "Invalid password" });
      }
    } else {
      res.send({ message: "manager not found" });
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

const getmanagers = async (req, res) => {
  try {
    let managers = await manager
      .find({ school: req.params.id })
      .populate("teachSubject", "subName")
      .populate("teachSclass", "sclassName");
    if (managers.length > 0) {
      let modifiedmanagers = managers.map((manager) => {
        return { ...manager._doc, password: undefined };
      });
      res.send(modifiedmanagers);
    } else {
      res.send({ message: "No managers found" });
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

const getmanagerDetail = async (req, res) => {
  try {
    let manager = await manager
      .findById(req.params.id)
      .populate("teachSubject", "subName sessions")
      .populate("school", "schoolName")
      .populate("teachSclass", "sclassName");
    if (manager) {
      manager.password = undefined;
      res.send(manager);
    } else {
      res.send({ message: "No manager found" });
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

const updatemanagerSubject = async (req, res) => {
  const { managerId, teachSubject } = req.body;
  try {
    const updatedmanager = await manager.findByIdAndUpdate(
      managerId,
      { teachSubject },
      { new: true }
    );

    await Subject.findByIdAndUpdate(teachSubject, {
      manager: updatedmanager._id,
    });

    res.send(updatedmanager);
  } catch (error) {
    res.status(500).json(error);
  }
};

const deletemanager = async (req, res) => {
  try {
    const deletedmanager = await manager.findByIdAndDelete(req.params.id);

    await Subject.updateOne(
      { manager: deletedmanager._id, manager: { $exists: true } },
      { $unset: { manager: 1 } }
    );

    res.send(deletedmanager);
  } catch (error) {
    res.status(500).json(error);
  }
};

const deletemanagers = async (req, res) => {
  try {
    const deletionResult = await manager.deleteMany({ school: req.params.id });

    const deletedCount = deletionResult.deletedCount || 0;

    if (deletedCount === 0) {
      res.send({ message: "No managers found to delete" });
      return;
    }

    const deletedmanagers = await manager.find({ school: req.params.id });

    await Subject.updateMany(
      {
        manager: { $in: deletedmanagers.map((manager) => manager._id) },
        manager: { $exists: true },
      },
      { $unset: { manager: "" }, $unset: { manager: null } }
    );

    res.send(deletionResult);
  } catch (error) {
    res.status(500).json(error);
  }
};

const deletemanagersByClass = async (req, res) => {
  try {
    const deletionResult = await manager.deleteMany({
      sclassName: req.params.id,
    });

    const deletedCount = deletionResult.deletedCount || 0;

    if (deletedCount === 0) {
      res.send({ message: "No managers found to delete" });
      return;
    }

    const deletedmanagers = await manager.find({ sclassName: req.params.id });

    await Subject.updateMany(
      {
        manager: { $in: deletedmanagers.map((manager) => manager._id) },
        manager: { $exists: true },
      },
      { $unset: { manager: "" }, $unset: { manager: null } }
    );

    res.send(deletionResult);
  } catch (error) {
    res.status(500).json(error);
  }
};

const managerAttendance = async (req, res) => {
  const { status, date } = req.body;

  try {
    const manager = await manager.findById(req.params.id);

    if (!manager) {
      return res.send({ message: "manager not found" });
    }

    const existingAttendance = manager.attendance.find(
      (a) => a.date.toDateString() === new Date(date).toDateString()
    );

    if (existingAttendance) {
      existingAttendance.status = status;
    } else {
      manager.attendance.push({ date, status });
    }

    const result = await manager.save();
    return res.send(result);
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports = {
  managerRegister,
  managerLogIn,
  getmanagers,
  getmanagerDetail,
  updatemanagerSubject,
  deletemanager,
  deletemanagers,
  deletemanagersByClass,
  managerAttendance,
};
