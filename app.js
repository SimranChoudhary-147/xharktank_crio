const { json } = require('express');
const express = require('express');
const app = express();
const mongoose = require('mongoose');
app.use(express.json());


//to connect the mongoDB with node.js
mongoose.connect("mongodb://localhost:27017/xharktank", {
    useNewUrlParser: true, useUnifiedTopology: true
})

//function to check validation of id 
function validate(str) {
    let i;
    for (i = 0; i < str.length; i++) {
        st = str[i].toLowerCase();
        if (str[i] > 'a' && str[i] < 'z')
            return false;
    }
    return true;
}


// schema for entrepreneur 
const entrep = {
    id: String,
    entrepreneur: String,
    pitchTitle: String,
    pitchIdea: String,
    askAmount: Number,
    equity:Number,
    createdAt: Date,
    offers: Object
}

// schema for counter 
const counterSchema = {
    id: {
        type: String
    },
    seq: {
        type: Number
    }
}

const counterModel = mongoose.model("counter", counterSchema);
const nonmodel = mongoose.model("Entrepreneurs", entrep);



//1. Endpoint to post a pitch to the backend
app.post("/pitches", (req, res) => {
    
    try {
        let k = req.body;
        var check=k.equity;
        if (k.entrepreneur &&
            k.pitchTitle &&
            k.pitchIdea &&
            k.askAmount &&
            k.equity &&
            k.equity<=100 && 
            k.equity>=0) {
            try {
                counterModel.findOneAndUpdate(
                    { id: "autoval" },
                    { $inc: { seq: 1 } },
                    { new: true }, (err, cd) => {
                        let seqId;
                        if (cd == null) {
                            const newval = new counterModel({ id: "autoval", seq: 1 })
                            newval.save()
                            seqId = 1
                        }
                        else {
                            seqId = cd.seq;
                        }
                        const data = new nonmodel({
                            id: seqId,
                            entrepreneur: k.entrepreneur,
                            pitchTitle: k.pitchTitle,
                            pitchIdea: k.pitchIdea,
                            askAmount: k.askAmount,
                            equity: k.equity,
                            createdAt: new Date(),
                            offers: [],
                        })
                        try {
                            data.save()
                            res.status(201).json({ "id": data.id })
                        }
                        catch (err) {
                            res.status(400).send("Invalid Request Body");
                        }
                    });
            } catch (error) {
                res.status(400).send("Invalid Request Body");
            }
        }
        else {
            res.status(400).send("Invalid Request Body");
        }
    }
    catch (error) {
        res.status(400).send("Invalid Request Body");
    }
});

//2. Endpoint to make a counter offer for a pitch to the backend
app.post("/pitches/:id/makeOffer", (req, res) => {
    let k = req.body;
    // console.log( typeof (k.equity)!='string')

    var val = req.params.id;
    //console.log(val.length)
        if (k.investor &&
            k.amount &&
            k.equity &&
            k.comment &&
            val.length &&
            validate(val) &&
            k.equity<=100 && 
            k.equity>=0 &&
            typeof (k.equity) != 'string' &&
            typeof (k.amount) != 'string') {
            try {

                nonmodel.findOne({ id: req.params.id }, (err, data) => {
                    if (data == null) {
                        res.status(404).send("Pitch Not Found")
                    }
                    else {
                        // console.log(data.length);
                        const newdata = new nonmodel({
                            offers: {
                                id: req.params.id,
                                investor: k.investor,
                                amount: k.amount,
                                equity: k.equity,
                                comment: k.comment
                            },
                        })
                        try {
                            nonmodel.findOneAndUpdate(
                                { id: req.params.id },
                                { $push: { offers: newdata.offers } },
                                { new: true }, (err, data) => {
                                    // console.log("data saved");
                                }
                            );
                            // newdata.save()
                            // console.log()
                            res.status(201).json({ "id": req.params.id })
                        }
                        catch (error) {
                            // console.log(error);
                            res.status(400).send(error)
                        }
                    }
                })
            } catch (error) {
                res.status(400).send("Invalid Request Body");
            }
        }
        else {
            res.status(400).send("Invalid Request Body")
        }
});

// 3.Endpoint to fetch the all the pitches in the reverse chronological order ( i.e. last created one first ) from the backend

app.get("/pitches", (req, res) => {
    try {
        nonmodel.find().sort({ createdAt: 'desc' }).populate("offers").exec((err, data) => {
            if (data == null) {
                res.status(400).send("No data found")
            }
            else {
                // console.log(data.offers);
                let i;
                try {
                    let obj = [];
                    for (i = 0; i < data.length; i++) {
                        let p = {
                            "id": data[i].id,
                            "entrepreneur": data[i].entrepreneur,
                            "pitchTitle": data[i].pitchTitle,
                            "pitchIdea": data[i].pitchIdea,
                            "askAmount": data[i].askAmount,
                            "equity": data[i].equity,
                            "offers": data[i].offers,
                        }
                        // console.log(p);
                        obj.push(p)
                    }
                    res.status(200).json(obj)
                } catch (err) {
                    res.status(404).send("Request Invalid")
                }
            }
        })
    } catch (error) {
        res.status(404).send("Request Invalid")
    }
});


// 4.Endpoint to specify a particular id (identifying the pitch) to fetch a single Pitch.
app.get("/pitches/:id", (req, res) => {
    try {
        let k=req.body;
        if (validate(req.params.id)) {
            nonmodel.findOne({ id: req.params.id }).populate("offers").exec((err, data) => {
                if (data == null) {
                    res.status(404).send("Pitch Not Found")
                }
                else {
                    //console.log(data);
                    res.status(200).json({
                        "id": data.id,
                        "entrepreneur": data.entrepreneur,
                        "pitchTitle": data.pitchTitle,
                        "pitchIdea": data.pitchIdea,
                        "askAmount": data.askAmount,
                        "equity": data.equity,
                        "offers": data.offers,
                    })
                }

            })
        } else {
            res.status(404).send("Invalid Pitch Id");
        }
    } catch (error) {
        res.status(404).send("Invalid Pitch Id");
    }
});



app.use((err, req, res, next) => {
    res.locals.error = err;
    const status = err.status || 400;
    res.status(status);
    res.render('error');
});


// to check the port number
app.listen(8081, () => {
    console.log("Server is running on port 8081");
})