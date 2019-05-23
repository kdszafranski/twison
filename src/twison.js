var Twison = {
  extractLinksFromText: function (text) {
    var links = text.match(/\[\[.+?\]\]/g)
    if (links) {
      return links.map(function (link) {
        var differentName = link.match(/\[\[(.*?)\-\&gt;(.*?)\]\]/);
        if (differentName) {
          // [[name->link]]
          // return differentName;
          return {
            name: differentName[1],
            link: differentName[2]
          };
        } else {
          // [[link]]
          link = link.substring(2, link.length - 2)
          return {
            name: link,
            link: link
          }
        }
      });
    }
  },

  extractEventDetails: function (text) {
    var details = text.match(/\(\(.+?\)\)/g);

    // details is an array
    if (details) {
      // results object
      var output = {};
      // add each tag found and add it to our output object as a key/value pair
      for (detail of details) {
        var chunks = detail.match(/\(\((.*?)\-\&gt;(.*?)\)\)/);
        // name is an array of string parts
        if (chunks) {
          output[chunks[1]] = chunks[2];
        }
      }

      // return output as one object with properties
      return output;
    }
  },

  convertPassage: function (passage) {
    var dict = { text: passage.innerHTML };

    // handle passage links
    var links = Twison.extractLinksFromText(dict.text);
    if (links) {
      dict.links = links;
    }

    // pull out scenario info from this passage
    var eventDetails = Twison.extractEventDetails(dict.text);
    if (eventDetails) {
      dict.eventDetails = eventDetails;
    }

    // process text
    // story text only
    /*
    This is a one-off, displayed event.\n\n\n((display->true))\n((locationName->CityHall))\n((npcName->Edwin Honeycut))\n((actionPointCost->1))\n((triggerTime->10))
    */
    var parts = dict.text.split("\n\n");
    dict.text = parts[0];

    // extract these tags from the passage data
    ["name", "pid", "position", "tags"].forEach(function (attr) {
      var value = passage.attributes[attr].value;
      if (value) {
        dict[attr] = value;
      }
    });

    if (dict.position) {
      var position = dict.position.split(',')
      dict.position = {
        x: position[0],
        y: position[1]
      }
    }

    if (dict.tags) {
      dict.tags = dict.tags.split(" ");
    }

    return dict;
  },

  convertStory: function (story) {
    var passages = story.getElementsByTagName("tw-passagedata");
    // convert each passage
    var convertedPassages = Array.prototype.slice.call(passages).map(Twison.convertPassage);

    var dict = {
      passages: convertedPassages
    };

    // extract global story info 
    ["name", "startnode", "creator", "creator-version", "ifid"].forEach(function (attr) {
      var value = story.attributes[attr].value;
      if (value) {
        dict[attr] = value;
      }
    });

    // Add PIDs to links
    var pidsByName = {};
    dict.passages.forEach(function (passage) {
      pidsByName[passage.name] = passage.pid;
    });
    // Search thru all other passages for matching pid to each link
    dict.passages.forEach(function (passage) {
      if (!passage.links) return;
      passage.links.forEach(function (link) {
        link.pid = pidsByName[link.link];
        if (!link.pid) {
          link.broken = true;
        }
      });
    });

    return dict;
  },

  // entry point, called from build.js
  convert: function () {
    var storyData = document.getElementsByTagName("tw-storydata")[0];
    var json = JSON.stringify(Twison.convertStory(storyData), null, 2);
    document.getElementById("output").innerHTML = json;
  }
}

window.Twison = Twison;